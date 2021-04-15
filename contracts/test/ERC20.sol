// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../IntegralERC20.sol';

contract ERC20 is IntegralERC20 {
    constructor(uint256 _totalSupply) {
        _mint(msg.sender, _totalSupply);
    }
}
