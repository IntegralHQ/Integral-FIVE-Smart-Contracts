// SPDX-License-Identifier: GPL-3.0-or-later
// Deployed with donations via Gitcoin GR9

pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import './SafeMath.sol';
import '../libraries/Math.sol';
import '../interfaces/IIntegralFactory.sol';
import '../interfaces/IIntegralPair.sol';
import '../libraries/TokenShares.sol';

library Orders {
    using SafeMath for uint256;
    using TokenShares for TokenShares.Data;
    using TransferHelper for address;

    enum OrderType {
        Empty,
        Deposit,
        Withdraw,
        Sell,
        Buy
    }
    enum OrderStatus {
        NonExistent,
        EnqueuedWaiting,
        EnqueuedReady,
        ExecutedSucceeded,
        ExecutedFailed,
        Canceled
    }

    event MaxGasLimitSet(uint256 maxGasLimit);
    event GasPriceInertiaSet(uint256 gasPriceInertia);
    event MaxGasPriceImpactSet(uint256 maxGasPriceImpact);
    event TransferGasCostSet(address token, uint256 gasCost);

    event DepositEnqueued(uint256 indexed orderId, uint128 validAfterTimestamp, uint256 gasPrice);
    event WithdrawEnqueued(uint256 indexed orderId, uint128 validAfterTimestamp, uint256 gasPrice);
    event SellEnqueued(uint256 indexed orderId, uint128 validAfterTimestamp, uint256 gasPrice);
    event BuyEnqueued(uint256 indexed orderId, uint128 validAfterTimestamp, uint256 gasPrice);

    uint8 private constant DEPOSIT_TYPE = 1;
    uint8 private constant WITHDRAW_TYPE = 2;
    uint8 private constant BUY_TYPE = 3;
    uint8 private constant BUY_INVERTED_TYPE = 4;
    uint8 private constant SELL_TYPE = 5;
    uint8 private constant SELL_INVERTED_TYPE = 6;

    uint8 private constant UNWRAP_NOT_FAILED = 0;
    uint8 private constant KEEP_NOT_FAILED = 1;
    uint8 private constant UNWRAP_FAILED = 2;
    uint8 private constant KEEP_FAILED = 3;

    uint256 private constant ETHER_TRANSFER_COST = 2300;
    uint256 private constant BUFFER_COST = 10000;
    uint256 private constant EXECUTE_PREPARATION_COST = 55000; // dequeue + getPair in execute

    uint256 public constant ETHER_TRANSFER_CALL_COST = 10000;
    uint256 public constant PAIR_TRANSFER_COST = 55000;
    uint256 public constant REFUND_END_COST = 2 * ETHER_TRANSFER_COST + BUFFER_COST;
    uint256 public constant ORDER_BASE_COST = EXECUTE_PREPARATION_COST + REFUND_END_COST;

    uint256 private constant TIMESTAMP_OFFSET = 1609455600; // 2021 Jan 1

    struct PairInfo {
        address pair;
        address token0;
        address token1;
    }

    struct Data {
        uint256 delay;
        uint256 newestOrderId;
        uint256 lastProcessedOrderId;
        mapping(uint256 => StoredOrder) orderQueue;
        address factory;
        uint256 maxGasLimit;
        uint256 gasPrice;
        uint256 gasPriceInertia;
        uint256 maxGasPriceImpact;
        mapping(uint32 => PairInfo) pairs;
        mapping(address => uint256) transferGasCosts;
        mapping(uint256 => bool) canceled;
        mapping(address => bool) depositDisabled;
        mapping(address => bool) withdrawDisabled;
        mapping(address => bool) buyDisabled;
        mapping(address => bool) sellDisabled;
    }

    struct StoredOrder {
        // slot 1
        uint8 orderType;
        uint32 validAfterTimestamp;
        uint8 unwrapAndFailure;
        uint32 deadline;
        uint32 gasLimit;
        uint32 gasPrice;
        uint112 liquidityOrRatio;
        // slot 1
        uint112 value0;
        uint112 value1;
        uint32 pairId;
        // slot2
        address to;
        uint32 minRatioChangeToSwap;
        uint32 minSwapPrice;
        uint32 maxSwapPrice;
    }

    struct DepositOrder {
        uint32 pairId;
        uint256 share0;
        uint256 share1;
        uint256 initialRatio;
        uint256 minRatioChangeToSwap;
        uint256 minSwapPrice;
        uint256 maxSwapPrice;
        bool unwrap;
        address to;
        uint256 gasPrice;
        uint256 gasLimit;
        uint256 deadline;
    }

    struct WithdrawOrder {
        uint32 pairId;
        uint256 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        bool unwrap;
        address to;
        uint256 gasPrice;
        uint256 gasLimit;
        uint256 deadline;
    }

    struct SellOrder {
        uint32 pairId;
        bool inverse;
        uint256 shareIn;
        uint256 amountOutMin;
        bool unwrap;
        address to;
        uint256 gasPrice;
        uint256 gasLimit;
        uint256 deadline;
    }

    struct BuyOrder {
        uint32 pairId;
        bool inverse;
        uint256 shareInMax;
        uint256 amountOut;
        bool unwrap;
        address to;
        uint256 gasPrice;
        uint256 gasLimit;
        uint256 deadline;
    }

    function decodeType(uint256 internalType) internal pure returns (OrderType orderType) {
        if (internalType == DEPOSIT_TYPE) {
            orderType = OrderType.Deposit;
        } else if (internalType == WITHDRAW_TYPE) {
            orderType = OrderType.Withdraw;
        } else if (internalType == BUY_TYPE) {
            orderType = OrderType.Buy;
        } else if (internalType == BUY_INVERTED_TYPE) {
            orderType = OrderType.Buy;
        } else if (internalType == SELL_TYPE) {
            orderType = OrderType.Sell;
        } else if (internalType == SELL_INVERTED_TYPE) {
            orderType = OrderType.Sell;
        } else {
            orderType = OrderType.Empty;
        }
    }

    function getOrder(Data storage data, uint256 orderId)
        public
        view
        returns (OrderType orderType, uint256 validAfterTimestamp)
    {
        StoredOrder storage order = data.orderQueue[orderId];
        uint8 internalType = order.orderType;
        validAfterTimestamp = uint32ToTimestamp(order.validAfterTimestamp);
        orderType = decodeType(internalType);
    }

    function getOrderStatus(Data storage data, uint256 orderId) external view returns (OrderStatus orderStatus) {
        if (orderId > data.newestOrderId) {
            return OrderStatus.NonExistent;
        }
        if (data.canceled[orderId]) {
            return OrderStatus.Canceled;
        }
        if (isRefundFailed(data, orderId)) {
            return OrderStatus.ExecutedFailed;
        }
        (OrderType orderType, uint256 validAfterTimestamp) = getOrder(data, orderId);
        if (orderType == OrderType.Empty) {
            return OrderStatus.ExecutedSucceeded;
        }
        if (validAfterTimestamp >= block.timestamp) {
            return OrderStatus.EnqueuedWaiting;
        }
        return OrderStatus.EnqueuedReady;
    }

    function getPair(
        Data storage data,
        address tokenA,
        address tokenB
    )
        internal
        returns (
            address pair,
            uint32 pairId,
            bool inverted
        )
    {
        inverted = tokenA > tokenB;
        (address token0, address token1) = inverted ? (tokenB, tokenA) : (tokenA, tokenB);
        pair = IIntegralFactory(data.factory).getPair(token0, token1);
        pairId = uint32(bytes4(keccak256(abi.encodePacked((pair)))));
        require(pair != address(0), 'OS_PAIR_NONEXISTENT');
        if (data.pairs[pairId].pair == address(0)) {
            data.pairs[pairId] = PairInfo(pair, token0, token1);
        }
    }

    function getPairInfo(Data storage data, uint32 pairId)
        external
        view
        returns (
            address pair,
            address token0,
            address token1
        )
    {
        PairInfo storage info = data.pairs[pairId];
        pair = info.pair;
        token0 = info.token0;
        token1 = info.token1;
    }

    function getDepositOrder(Data storage data, uint256 index) public view returns (DepositOrder memory order) {
        StoredOrder memory stored = data.orderQueue[index];
        require(stored.orderType == DEPOSIT_TYPE, 'OS_INVALID_ORDER_TYPE');
        order.pairId = stored.pairId;
        order.share0 = stored.value0;
        order.share1 = stored.value1;
        order.initialRatio = stored.liquidityOrRatio;
        order.minRatioChangeToSwap = stored.minRatioChangeToSwap;
        order.minSwapPrice = float32ToUint(stored.minSwapPrice);
        order.maxSwapPrice = float32ToUint(stored.maxSwapPrice);
        order.unwrap = getUnwrap(stored.unwrapAndFailure);
        order.to = stored.to;
        order.gasPrice = uint32ToGasPrice(stored.gasPrice);
        order.gasLimit = stored.gasLimit;
        order.deadline = uint32ToTimestamp(stored.deadline);
    }

    function getWithdrawOrder(Data storage data, uint256 index) public view returns (WithdrawOrder memory order) {
        StoredOrder memory stored = data.orderQueue[index];
        require(stored.orderType == WITHDRAW_TYPE, 'OS_INVALID_ORDER_TYPE');
        order.pairId = stored.pairId;
        order.liquidity = stored.liquidityOrRatio;
        order.amount0Min = stored.value0;
        order.amount1Min = stored.value1;
        order.unwrap = getUnwrap(stored.unwrapAndFailure);
        order.to = stored.to;
        order.gasPrice = uint32ToGasPrice(stored.gasPrice);
        order.gasLimit = stored.gasLimit;
        order.deadline = uint32ToTimestamp(stored.deadline);
    }

    function getSellOrder(Data storage data, uint256 index) public view returns (SellOrder memory order) {
        StoredOrder memory stored = data.orderQueue[index];
        require(stored.orderType == SELL_TYPE || stored.orderType == SELL_INVERTED_TYPE, 'OS_INVALID_ORDER_TYPE');
        order.pairId = stored.pairId;
        order.inverse = stored.orderType == SELL_INVERTED_TYPE;
        order.shareIn = stored.value0;
        order.amountOutMin = stored.value1;
        order.unwrap = getUnwrap(stored.unwrapAndFailure);
        order.to = stored.to;
        order.gasPrice = uint32ToGasPrice(stored.gasPrice);
        order.gasLimit = stored.gasLimit;
        order.deadline = uint32ToTimestamp(stored.deadline);
    }

    function getBuyOrder(Data storage data, uint256 index) public view returns (BuyOrder memory order) {
        StoredOrder memory stored = data.orderQueue[index];
        require(stored.orderType == BUY_TYPE || stored.orderType == BUY_INVERTED_TYPE, 'OS_INVALID_ORDER_TYPE');
        order.pairId = stored.pairId;
        order.inverse = stored.orderType == BUY_INVERTED_TYPE;
        order.shareInMax = stored.value0;
        order.amountOut = stored.value1;
        order.unwrap = getUnwrap(stored.unwrapAndFailure);
        order.to = stored.to;
        order.gasPrice = uint32ToGasPrice(stored.gasPrice);
        order.gasLimit = stored.gasLimit;
        order.deadline = uint32ToTimestamp(stored.deadline);
    }

    function getFailedOrderType(Data storage data, uint256 orderId)
        external
        view
        returns (OrderType orderType, uint256 validAfterTimestamp)
    {
        require(isRefundFailed(data, orderId), 'OS_NO_POSSIBLE_REFUND');
        (orderType, validAfterTimestamp) = getOrder(data, orderId);
    }

    function getUnwrap(uint8 unwrapAndFailure) private pure returns (bool) {
        return unwrapAndFailure == UNWRAP_FAILED || unwrapAndFailure == UNWRAP_NOT_FAILED;
    }

    function getUnwrapAndFailure(bool unwrap) private pure returns (uint8) {
        return unwrap ? UNWRAP_NOT_FAILED : KEEP_NOT_FAILED;
    }

    function timestampToUint32(uint256 timestamp) private pure returns (uint32 timestamp32) {
        if (timestamp == uint256(-1)) {
            return uint32(-1);
        }
        timestamp32 = uintToUint32(timestamp.sub(TIMESTAMP_OFFSET));
    }

    function uint32ToTimestamp(uint32 timestamp32) private pure returns (uint256 timestamp) {
        if (timestamp32 == uint32(-1)) {
            return uint256(-1);
        }
        if (timestamp32 == 0) {
            return 0;
        }
        timestamp = uint256(timestamp32) + TIMESTAMP_OFFSET;
    }

    function gasPriceToUint32(uint256 gasPrice) private pure returns (uint32 gasPrice32) {
        require((gasPrice / 1e6) * 1e6 == gasPrice, 'OS_GAS_PRICE_PRECISION');
        gasPrice32 = uintToUint32(gasPrice / 1e6);
    }

    function uint32ToGasPrice(uint32 gasPrice32) public pure returns (uint256 gasPrice) {
        gasPrice = uint256(gasPrice32) * 1e6;
    }

    function uintToUint32(uint256 number) private pure returns (uint32 number32) {
        number32 = uint32(number);
        require(uint256(number32) == number, 'OS_OVERFLOW_32');
    }

    function uintToUint112(uint256 number) private pure returns (uint112 number112) {
        number112 = uint112(number);
        require(uint256(number112) == number, 'OS_OVERFLOW_112');
    }

    function uintToFloat32(uint256 number) internal pure returns (uint32 float32) {
        // Number is encoded on 4 bytes. 3 bytes for mantissa and 1 for exponent.
        // If the number fits in the mantissa we set the exponent to zero and return.
        if (number < 2 << 24) {
            return uint32(number << 8);
        }
        // We find the exponent by counting the number of trailing zeroes.
        // Simultaneously we remove those zeroes from the number.
        uint32 exponent;
        for (exponent = 0; exponent < 256 - 24; exponent++) {
            // Last bit is one.
            if (number & 1 == 1) {
                break;
            }
            number = number >> 1;
        }
        // The number must fit in the mantissa.
        require(number < 2 << 24, 'OS_OVERFLOW_FLOAT_ENCODE');
        // Set the first three bytes to the number and the fourth to the exponent.
        float32 = uint32(number << 8) | exponent;
    }

    function float32ToUint(uint32 float32) internal pure returns (uint256 number) {
        // Number is encoded on 4 bytes. 3 bytes for mantissa and 1 for exponent.
        // We get the exponent by extracting the last byte.
        uint256 exponent = float32 & 0xFF;
        // Sanity check. Only triggered for values not encoded with uintToFloat32.
        require(exponent <= 256 - 24, 'OS_OVERFLOW_FLOAT_DECODE');
        // We get the mantissa by extracting the first three bytes and removing the fourth.
        uint256 mantissa = (float32 & 0xFFFFFF00) >> 8;
        // We add exponent number zeroes after the mantissa.
        number = mantissa << exponent;
    }

    function enqueueDepositOrder(Data storage data, DepositOrder memory depositOrder) internal {
        data.newestOrderId++;
        uint128 validAfterTimestamp = uint128(block.timestamp + data.delay);
        emit DepositEnqueued(data.newestOrderId, validAfterTimestamp, depositOrder.gasPrice);
        data.orderQueue[data.newestOrderId] = StoredOrder(
            DEPOSIT_TYPE,
            timestampToUint32(validAfterTimestamp),
            getUnwrapAndFailure(depositOrder.unwrap),
            timestampToUint32(depositOrder.deadline),
            uintToUint32(depositOrder.gasLimit),
            gasPriceToUint32(depositOrder.gasPrice),
            uintToUint112(depositOrder.initialRatio),
            uintToUint112(depositOrder.share0),
            uintToUint112(depositOrder.share1),
            depositOrder.pairId,
            depositOrder.to,
            uint32(depositOrder.minRatioChangeToSwap),
            uintToFloat32(depositOrder.minSwapPrice),
            uintToFloat32(depositOrder.maxSwapPrice)
        );
    }

    function enqueueWithdrawOrder(Data storage data, WithdrawOrder memory withdrawOrder) internal {
        data.newestOrderId++;
        uint128 validAfterTimestamp = uint128(block.timestamp + data.delay);
        emit WithdrawEnqueued(data.newestOrderId, validAfterTimestamp, withdrawOrder.gasPrice);
        data.orderQueue[data.newestOrderId] = StoredOrder(
            WITHDRAW_TYPE,
            timestampToUint32(validAfterTimestamp),
            getUnwrapAndFailure(withdrawOrder.unwrap),
            timestampToUint32(withdrawOrder.deadline),
            uintToUint32(withdrawOrder.gasLimit),
            gasPriceToUint32(withdrawOrder.gasPrice),
            uintToUint112(withdrawOrder.liquidity),
            uintToUint112(withdrawOrder.amount0Min),
            uintToUint112(withdrawOrder.amount1Min),
            withdrawOrder.pairId,
            withdrawOrder.to,
            0, // maxRatioChange
            0, // minSwapPrice
            0 // maxSwapPrice
        );
    }

    function enqueueSellOrder(Data storage data, SellOrder memory sellOrder) internal {
        data.newestOrderId++;
        uint128 validAfterTimestamp = uint128(block.timestamp + data.delay);
        emit SellEnqueued(data.newestOrderId, validAfterTimestamp, sellOrder.gasPrice);
        data.orderQueue[data.newestOrderId] = StoredOrder(
            sellOrder.inverse ? SELL_INVERTED_TYPE : SELL_TYPE,
            timestampToUint32(validAfterTimestamp),
            getUnwrapAndFailure(sellOrder.unwrap),
            timestampToUint32(sellOrder.deadline),
            uintToUint32(sellOrder.gasLimit),
            gasPriceToUint32(sellOrder.gasPrice),
            0, // liquidityOrRatio
            uintToUint112(sellOrder.shareIn),
            uintToUint112(sellOrder.amountOutMin),
            sellOrder.pairId,
            sellOrder.to,
            0, // maxRatioChange
            0, // minSwapPrice
            0 // maxSwapPrice
        );
    }

    function enqueueBuyOrder(Data storage data, BuyOrder memory buyOrder) internal {
        data.newestOrderId++;
        uint128 validAfterTimestamp = uint128(block.timestamp + data.delay);
        emit BuyEnqueued(data.newestOrderId, validAfterTimestamp, buyOrder.gasPrice);
        data.orderQueue[data.newestOrderId] = StoredOrder(
            buyOrder.inverse ? BUY_INVERTED_TYPE : BUY_TYPE,
            timestampToUint32(validAfterTimestamp),
            getUnwrapAndFailure(buyOrder.unwrap),
            timestampToUint32(buyOrder.deadline),
            uintToUint32(buyOrder.gasLimit),
            gasPriceToUint32(buyOrder.gasPrice),
            0, // liquidityOrRatio
            uintToUint112(buyOrder.shareInMax),
            uintToUint112(buyOrder.amountOut),
            buyOrder.pairId,
            buyOrder.to,
            0, // maxRatioChange
            0, // minSwapPrice
            0 // maxSwapPrice
        );
    }

    function isRefundFailed(Data storage data, uint256 index) internal view returns (bool) {
        uint8 unwrapAndFailure = data.orderQueue[index].unwrapAndFailure;
        return unwrapAndFailure == UNWRAP_FAILED || unwrapAndFailure == KEEP_FAILED;
    }

    function markRefundFailed(Data storage data) internal {
        StoredOrder storage stored = data.orderQueue[data.lastProcessedOrderId];
        stored.unwrapAndFailure = stored.unwrapAndFailure == UNWRAP_NOT_FAILED ? UNWRAP_FAILED : KEEP_FAILED;
    }

    function getNextOrder(Data storage data) internal view returns (OrderType orderType, uint256 validAfterTimestamp) {
        return getOrder(data, data.lastProcessedOrderId + 1);
    }

    function dequeueCanceledOrder(Data storage data) external {
        data.lastProcessedOrderId++;
    }

    function dequeueDepositOrder(Data storage data) external returns (DepositOrder memory order) {
        data.lastProcessedOrderId++;
        order = getDepositOrder(data, data.lastProcessedOrderId);
    }

    function dequeueWithdrawOrder(Data storage data) external returns (WithdrawOrder memory order) {
        data.lastProcessedOrderId++;
        order = getWithdrawOrder(data, data.lastProcessedOrderId);
    }

    function dequeueSellOrder(Data storage data) external returns (SellOrder memory order) {
        data.lastProcessedOrderId++;
        order = getSellOrder(data, data.lastProcessedOrderId);
    }

    function dequeueBuyOrder(Data storage data) external returns (BuyOrder memory order) {
        data.lastProcessedOrderId++;
        order = getBuyOrder(data, data.lastProcessedOrderId);
    }

    function forgetOrder(Data storage data, uint256 orderId) internal {
        delete data.orderQueue[orderId];
    }

    function forgetLastProcessedOrder(Data storage data) internal {
        delete data.orderQueue[data.lastProcessedOrderId];
    }

    struct DepositParams {
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint256 initialRatio;
        uint256 minRatioChangeToSwap;
        uint256 minSwapPrice;
        uint256 maxSwapPrice;
        bool wrap;
        address to;
        uint256 gasLimit;
        uint256 submitDeadline;
        uint256 executionDeadline;
    }

    function deposit(
        Data storage data,
        DepositParams calldata depositParams,
        TokenShares.Data storage tokenShares
    ) external {
        require(
            data.transferGasCosts[depositParams.token0] != 0 && data.transferGasCosts[depositParams.token1] != 0,
            'OS_TOKEN_TRANSFER_GAS_COST_UNSET'
        );
        checkOrderParams(
            data,
            depositParams.to,
            depositParams.gasLimit,
            depositParams.submitDeadline,
            depositParams.executionDeadline,
            ORDER_BASE_COST.add(data.transferGasCosts[depositParams.token0]).add(
                data.transferGasCosts[depositParams.token1]
            )
        );
        require(depositParams.amount0 != 0 || depositParams.amount1 != 0, 'OS_NO_AMOUNT');
        (address pair, uint32 pairId, bool inverted) = getPair(data, depositParams.token0, depositParams.token1);
        require(!data.depositDisabled[pair], 'OS_DEPOSIT_DISABLED');

        uint256 value = msg.value;

        // allocate gas refund
        if (depositParams.token0 == tokenShares.weth && depositParams.wrap) {
            value = value.sub(depositParams.amount0, 'OS_NOT_ENOUGH_FUNDS');
        } else if (depositParams.token1 == tokenShares.weth && depositParams.wrap) {
            value = value.sub(depositParams.amount1, 'OS_NOT_ENOUGH_FUNDS');
        }
        allocateGasRefund(data, value, depositParams.gasLimit);

        uint256 shares0 = tokenShares.amountToShares(depositParams.token0, depositParams.amount0, depositParams.wrap);
        uint256 shares1 = tokenShares.amountToShares(depositParams.token1, depositParams.amount1, depositParams.wrap);

        IIntegralPair(pair).syncWithOracle();
        enqueueDepositOrder(
            data,
            DepositOrder(
                pairId,
                inverted ? shares1 : shares0,
                inverted ? shares0 : shares1,
                depositParams.initialRatio,
                depositParams.minRatioChangeToSwap,
                depositParams.minSwapPrice,
                depositParams.maxSwapPrice,
                depositParams.wrap,
                depositParams.to,
                data.gasPrice,
                depositParams.gasLimit,
                depositParams.executionDeadline
            )
        );
    }

    struct WithdrawParams {
        address token0;
        address token1;
        uint256 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        bool unwrap;
        address to;
        uint256 gasLimit;
        uint256 submitDeadline;
        uint256 executionDeadline;
    }

    function withdraw(Data storage data, WithdrawParams calldata withdrawParams) external {
        (address pair, uint32 pairId, bool inverted) = getPair(data, withdrawParams.token0, withdrawParams.token1);
        require(!data.withdrawDisabled[pair], 'OS_WITHDRAW_DISABLED');
        checkOrderParams(
            data,
            withdrawParams.to,
            withdrawParams.gasLimit,
            withdrawParams.submitDeadline,
            withdrawParams.executionDeadline,
            ORDER_BASE_COST.add(PAIR_TRANSFER_COST)
        );
        require(withdrawParams.liquidity != 0, 'OS_NO_LIQUIDITY');

        allocateGasRefund(data, msg.value, withdrawParams.gasLimit);
        pair.safeTransferFrom(msg.sender, address(this), withdrawParams.liquidity);

        IIntegralPair(pair).syncWithOracle();
        enqueueWithdrawOrder(
            data,
            WithdrawOrder(
                pairId,
                withdrawParams.liquidity,
                inverted ? withdrawParams.amount1Min : withdrawParams.amount0Min,
                inverted ? withdrawParams.amount0Min : withdrawParams.amount1Min,
                withdrawParams.unwrap,
                withdrawParams.to,
                data.gasPrice,
                withdrawParams.gasLimit,
                withdrawParams.executionDeadline
            )
        );
    }

    struct SellParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        bool wrapUnwrap;
        address to;
        uint256 gasLimit;
        uint256 submitDeadline;
        uint256 executionDeadline;
    }

    function sell(
        Data storage data,
        SellParams calldata sellParams,
        TokenShares.Data storage tokenShares
    ) external {
        require(data.transferGasCosts[sellParams.tokenIn] != 0, 'OS_TOKEN_TRANSFER_GAS_COST_UNSET');
        checkOrderParams(
            data,
            sellParams.to,
            sellParams.gasLimit,
            sellParams.submitDeadline,
            sellParams.executionDeadline,
            ORDER_BASE_COST.add(data.transferGasCosts[sellParams.tokenIn])
        );
        require(sellParams.amountIn != 0, 'OS_NO_AMOUNT_IN');
        (address pair, uint32 pairId, bool inverted) = getPair(data, sellParams.tokenIn, sellParams.tokenOut);
        require(!data.sellDisabled[pair], 'OS_SELL_DISABLED');
        uint256 value = msg.value;

        // allocate gas refund
        if (sellParams.tokenIn == tokenShares.weth && sellParams.wrapUnwrap) {
            value = value.sub(sellParams.amountIn, 'OS_NOT_ENOUGH_FUNDS');
        }
        allocateGasRefund(data, value, sellParams.gasLimit);

        uint256 shares = tokenShares.amountToShares(sellParams.tokenIn, sellParams.amountIn, sellParams.wrapUnwrap);

        IIntegralPair(pair).syncWithOracle();
        enqueueSellOrder(
            data,
            SellOrder(
                pairId,
                inverted,
                shares,
                sellParams.amountOutMin,
                sellParams.wrapUnwrap,
                sellParams.to,
                data.gasPrice,
                sellParams.gasLimit,
                sellParams.executionDeadline
            )
        );
    }

    struct BuyParams {
        address tokenIn;
        address tokenOut;
        uint256 amountInMax;
        uint256 amountOut;
        bool wrapUnwrap;
        address to;
        uint256 gasLimit;
        uint256 submitDeadline;
        uint256 executionDeadline;
    }

    function buy(
        Data storage data,
        BuyParams calldata buyParams,
        TokenShares.Data storage tokenShares
    ) external {
        require(data.transferGasCosts[buyParams.tokenIn] != 0, 'OS_TOKEN_TRANSFER_GAS_COST_UNSET');
        checkOrderParams(
            data,
            buyParams.to,
            buyParams.gasLimit,
            buyParams.submitDeadline,
            buyParams.executionDeadline,
            ORDER_BASE_COST.add(data.transferGasCosts[buyParams.tokenIn])
        );
        require(buyParams.amountOut != 0, 'OS_NO_AMOUNT_OUT');
        (address pair, uint32 pairId, bool inverted) = getPair(data, buyParams.tokenIn, buyParams.tokenOut);
        require(!data.buyDisabled[pair], 'OS_BUY_DISABLED');

        uint256 value = msg.value;

        // allocate gas refund
        if (buyParams.tokenIn == tokenShares.weth && buyParams.wrapUnwrap) {
            value = value.sub(buyParams.amountInMax, 'OS_NOT_ENOUGH_FUNDS');
        }
        allocateGasRefund(data, value, buyParams.gasLimit);

        uint256 shares = tokenShares.amountToShares(buyParams.tokenIn, buyParams.amountInMax, buyParams.wrapUnwrap);

        IIntegralPair(pair).syncWithOracle();
        enqueueBuyOrder(
            data,
            BuyOrder(
                pairId,
                inverted,
                shares,
                buyParams.amountOut,
                buyParams.wrapUnwrap,
                buyParams.to,
                data.gasPrice,
                buyParams.gasLimit,
                buyParams.executionDeadline
            )
        );
    }

    function checkOrderParams(
        Data storage data,
        address to,
        uint256 gasLimit,
        uint256 submitDeadline,
        uint256 executionDeadline,
        uint256 minGasLimit
    ) private view {
        require(submitDeadline >= block.timestamp, 'OS_EXPIRED');
        require(executionDeadline > block.timestamp.add(data.delay), 'OS_INVALID_DEADLINE');
        require(gasLimit <= data.maxGasLimit, 'OS_GAS_LIMIT_TOO_HIGH');
        require(gasLimit >= minGasLimit, 'OS_GAS_LIMIT_TOO_LOW');
        require(to != address(0), 'OS_NO_ADDRESS');
    }

    function allocateGasRefund(
        Data storage data,
        uint256 value,
        uint256 gasLimit
    ) private returns (uint256 futureFee) {
        futureFee = data.gasPrice.mul(gasLimit);
        require(value >= futureFee, 'OS_NOT_ENOUGH_FUNDS');
        if (value > futureFee) {
            msg.sender.transfer(value.sub(futureFee));
        }
    }

    function updateGasPrice(Data storage data, uint256 gasUsed) external {
        uint256 scale = Math.min(gasUsed, data.maxGasPriceImpact);
        uint256 updated = data.gasPrice.mul(data.gasPriceInertia.sub(scale)).add(tx.gasprice.mul(scale)).div(
            data.gasPriceInertia
        );
        // we lower the precision for gas savings in order queue
        data.gasPrice = updated - (updated % 1e6);
    }

    function setMaxGasLimit(Data storage data, uint256 _maxGasLimit) external {
        require(_maxGasLimit <= 10000000, 'OS_MAX_GAS_LIMIT_TOO_HIGH');
        data.maxGasLimit = _maxGasLimit;
        emit MaxGasLimitSet(_maxGasLimit);
    }

    function setGasPriceInertia(Data storage data, uint256 _gasPriceInertia) external {
        require(_gasPriceInertia >= 1, 'OS_INVALID_INERTIA');
        data.gasPriceInertia = _gasPriceInertia;
        emit GasPriceInertiaSet(_gasPriceInertia);
    }

    function setMaxGasPriceImpact(Data storage data, uint256 _maxGasPriceImpact) external {
        require(_maxGasPriceImpact <= data.gasPriceInertia, 'OS_INVALID_MAX_GAS_PRICE_IMPACT');
        data.maxGasPriceImpact = _maxGasPriceImpact;
        emit MaxGasPriceImpactSet(_maxGasPriceImpact);
    }

    function setTransferGasCost(
        Data storage data,
        address token,
        uint256 gasCost
    ) external {
        data.transferGasCosts[token] = gasCost;
        emit TransferGasCostSet(token, gasCost);
    }
}
