// SPDX-License-Identifier: GPL-3.0-or-later
// Deployed with donations via Gitcoin GR9

pragma solidity 0.7.5;

interface IIntegralMath {
    // PRICE

    function calcSpotPrice(
        uint256 tokenXBalance,
        uint256 tokenYBalance,
        uint256 swapFee
    ) external returns (uint256 spotPrice);

    // TRADING

    function calcYOutGivenXIn(
        uint256 tokenXBalance,
        uint256 tokenYBalance,
        uint256 tokenXAmountIn,
        uint256 swapFee
    ) external returns (uint256 tokenYAmountOut);

    function calcXOutGivenYIn(
        uint256 tokenXBalance,
        uint256 tokenYBalance,
        uint256 tokenYAmountIn,
        uint256 swapFee
    ) external returns (uint256 tokenXAmountOut);

    function calcYInGivenXOut(
        uint256 tokenXBalance,
        uint256 tokenYBalance,
        uint256 tokenXAmountOut,
        uint256 swapFee
    ) external returns (uint256 tokenYAmountIn);

    function calcXInGivenYOut(
        uint256 tokenXBalance,
        uint256 tokenYBalance,
        uint256 tokenYAmountOut,
        uint256 swapFee
    ) external returns (uint256 tokenXAmountIn);

    // DEPOSIT

    function calcPoolOutGivenAllIn(
        uint256 tokenXBalanceInitial,
        uint256 tokenYBalanceInitial,
        uint256 tokenXBalanceCurrent,
        uint256 tokenYBalanceCurrent,
        uint256 poolSupply,
        uint256 maxTokenXAmountIn,
        uint256 maxTokenYAmountIn,
        uint256 joinFee
    )
        external
        returns (
            uint256 poolAmountOut,
            uint256 tokenXAmountIn,
            uint256 tokenYAmountIn,
            uint256 tokenXFee,
            uint256 tokenYFee
        );

    function calcAllInGivenPoolOut(
        uint256 tokenXBalanceInitial,
        uint256 tokenYBalanceInitial,
        uint256 tokenXBalanceCurrent,
        uint256 tokenYBalanceCurrent,
        uint256 poolSupply,
        uint256 poolAmountOut,
        uint256 joinFee
    )
        external
        returns (
            uint256 tokenXAmountIn,
            uint256 tokenYAmountIn,
            uint256 tokenXFee,
            uint256 tokenYFee
        );

    // WITHDRAW

    function calcPoolInGivenAllOut(
        uint256 tokenXBalanceInitial,
        uint256 tokenYBalanceInitial,
        uint256 tokenXBalanceCurrent,
        uint256 tokenYBalanceCurrent,
        uint256 poolSupply,
        uint256 minTokenXAmountOut,
        uint256 minTokenYAmountOut,
        uint256 exitFee
    )
        external
        returns (
            uint256 poolAmountIn,
            uint256 tokenXAmountOut,
            uint256 tokenYAmountOut,
            uint256 tokenXFee,
            uint256 tokenYFee
        );

    function calcAllOutGivenPoolIn(
        uint256 tokenXBalanceInitial,
        uint256 tokenYBalanceInitial,
        uint256 tokenXBalanceCurrent,
        uint256 tokenYBalanceCurrent,
        uint256 poolSupply,
        uint256 poolAmountIn,
        uint256 exitFee
    )
        external
        returns (
            uint256 tokenXAmountOut,
            uint256 tokenYAmountOut,
            uint256 tokenXFee,
            uint256 tokenYFee
        );
}
