// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import '../IntegralDelay.sol';

contract DelayTest is IntegralDelay {
    using Orders for Orders.Data;

    constructor(
        address _factory,
        address _weth,
        address _bot
    ) IntegralDelay(_factory, _weth, _bot) {}

    function setGasPrice(uint256 _gasPrice) public {
        orders.gasPrice = _gasPrice;
    }

    function registerPair(address tokenA, address tokenB) public {
        orders.getPair(tokenA, tokenB);
    }

    function testCanSwap(
        uint256 initialRatio,
        uint256 minRatioChangeToSwap,
        address pairAddress
    ) public view returns (bool) {
        return AddLiquidity.canSwap(initialRatio, minRatioChangeToSwap, pairAddress);
    }

    function testUpdateGasPrice(uint256 gasUsed) public {
        orders.updateGasPrice(gasUsed);
    }

    function testPerformRefund(
        Orders.OrderType orderType,
        uint256 validAfterTimestamp,
        uint256 orderId,
        bool shouldRefundEth
    ) public {
        performRefund(orderType, validAfterTimestamp, orderId, shouldRefundEth);
    }
}
