// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../libraries/Normalizer.sol';

contract NormalizerTest {
    function _normalizeAmount(uint256 amount, uint8 decimals) public pure returns (uint256) {
        return Normalizer.normalize(amount, decimals);
    }

    function _denormalizeAmount(uint256 amount, uint8 decimals) public pure returns (uint256) {
        return Normalizer.denormalize(amount, decimals);
    }
}
