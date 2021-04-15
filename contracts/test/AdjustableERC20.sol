// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../libraries/AbstractERC20.sol';

contract AdjustableERC20 is AbstractERC20 {
    string public override name = 'AdjustableERC20';
    string public override symbol = 'ADJ';
    uint8 public override decimals = 18;

    constructor(uint256 _totalSupply) {
        _init(name);
        _mint(msg.sender, _totalSupply);
    }

    function setBalance(address account, uint256 value) public {
        balanceOf[account] = value;
    }
}
