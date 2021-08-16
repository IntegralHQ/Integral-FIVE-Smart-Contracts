// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

// imports needed to generate types for tests
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

contract UniswapV3PoolTest {
    uint256 public liquidity;
    address public token0;
    address public token1;

    constructor(
        uint256 _liquidity,
        address _token0,
        address _token1
    ) {
        liquidity = _liquidity;
        token0 = _token0;
        token1 = _token1;
    }
}
