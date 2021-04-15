// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import '../libraries/Orders.sol';

contract OrdersTest {
    using Orders for Orders.Data;
    Orders.Data orders;

    event DepositEnqueued(uint256 indexed orderId, uint128 validAfterTimestamp, uint256 gasPrice);
    event WithdrawEnqueued(uint256 indexed orderId, uint128 validAfterTimestamp, uint256 gasPrice);
    event SellEnqueued(uint256 indexed orderId, uint128 validAfterTimestamp, uint256 gasPrice);
    event BuyEnqueued(uint256 indexed orderId, uint128 validAfterTimestamp, uint256 gasPrice);

    constructor() {
        orders.delay = 5 * 60; //five minutes
    }

    function delay() public view returns (uint256) {
        return orders.delay;
    }

    function lastProcessedOrderId() public view returns (uint256) {
        return orders.lastProcessedOrderId;
    }

    function newestOrderId() public view returns (uint256) {
        return orders.newestOrderId;
    }

    function getOrder(uint256 orderId) public view returns (Orders.OrderType orderType, uint256 validAfterTimestamp) {
        return orders.getOrder(orderId);
    }

    function getDepositOrder(uint256 orderId) public view returns (Orders.DepositOrder memory order) {
        return orders.getDepositOrder(orderId);
    }

    function getWithdrawOrder(uint256 orderId) public view returns (Orders.WithdrawOrder memory order) {
        return orders.getWithdrawOrder(orderId);
    }

    function getSellOrder(uint256 orderId) public view returns (Orders.SellOrder memory order) {
        return orders.getSellOrder(orderId);
    }

    function getBuyOrder(uint256 orderId) public view returns (Orders.BuyOrder memory order) {
        return orders.getBuyOrder(orderId);
    }

    function _enqueueDepositOrder(
        uint32 pairId,
        uint256 share0,
        uint256 share1,
        uint256 initialRatio,
        uint256 minRatioChangeToSwap,
        uint256 minSwapPrice,
        uint256 maxSwapPrice,
        bool unwrap,
        address to,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 deadline
    ) public {
        orders.enqueueDepositOrder(
            Orders.DepositOrder(
                pairId,
                share0,
                share1,
                initialRatio,
                minRatioChangeToSwap,
                minSwapPrice,
                maxSwapPrice,
                unwrap,
                to,
                gasPrice,
                gasLimit,
                deadline
            )
        );
    }

    function _enqueueWithdrawOrder(
        uint32 pairId,
        uint256 amount,
        uint256 amountAMin,
        uint256 amountBMin,
        bool unwrap,
        address to,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 deadline
    ) public {
        orders.enqueueWithdrawOrder(
            Orders.WithdrawOrder(pairId, amount, amountAMin, amountBMin, unwrap, to, gasPrice, gasLimit, deadline)
        );
    }

    function _enqueueSellOrder(
        uint32 pairId,
        bool inverse,
        uint256 shareIn,
        uint256 amountOutMin,
        bool unwrap,
        address to,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 deadline
    ) public {
        orders.enqueueSellOrder(
            Orders.SellOrder(pairId, inverse, shareIn, amountOutMin, unwrap, to, gasPrice, gasLimit, deadline)
        );
    }

    function _enqueueBuyOrder(
        uint32 pairId,
        bool inverse,
        uint256 shareInMax,
        uint256 amountOut,
        bool unwrap,
        address to,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 deadline
    ) public {
        orders.enqueueBuyOrder(
            Orders.BuyOrder(pairId, inverse, shareInMax, amountOut, unwrap, to, gasPrice, gasLimit, deadline)
        );
    }

    function _dequeueDepositOrder() public returns (Orders.DepositOrder memory order) {
        return orders.dequeueDepositOrder();
    }

    function _dequeueWithdrawOrder() public returns (Orders.WithdrawOrder memory order) {
        return orders.dequeueWithdrawOrder();
    }

    function _dequeueSellOrder() public returns (Orders.SellOrder memory order) {
        return orders.dequeueSellOrder();
    }

    function _dequeueBuyOrder() public returns (Orders.BuyOrder memory order) {
        return orders.dequeueBuyOrder();
    }

    function uintToFloat32(uint256 number) public pure returns (uint32 float32) {
        return Orders.uintToFloat32(number);
    }

    function float32ToUint(uint32 float32) public pure returns (uint256 number) {
        return Orders.float32ToUint(float32);
    }

    function forgetLastProcessedOrder() public {
        return orders.forgetLastProcessedOrder();
    }
}
