// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../IntegralLPToken.sol';

contract ERC20 is IntegralLPToken {
    constructor(uint256 _totalSupply) {
        _mint(msg.sender, _totalSupply);
    }
}
