// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../libraries/FixedSafeMath.sol';
import '../libraries/Math.sol';

contract FixedSafeMathTest {
    using FixedSafeMath for int256;

    function add(int256 a, int256 b) external pure returns (int256) {
        return a.add(b);
    }

    function sub(int256 a, int256 b) external pure returns (int256) {
        return a.sub(b);
    }

    function f18Mul(int256 a, int256 b) external pure returns (int256) {
        return a.f18Mul(b);
    }

    function f18Div(int256 a, int256 b) external pure returns (int256) {
        return a.f18Div(b);
    }

    function f18Sqrt(int256 a) external pure returns (int256) {
        return a.f18Sqrt();
    }
}
