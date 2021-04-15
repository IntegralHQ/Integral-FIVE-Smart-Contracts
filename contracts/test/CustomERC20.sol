// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../libraries/AbstractERC20.sol';

contract CustomERC20 is AbstractERC20 {
    string public override name;
    string public override symbol;
    uint8 public override decimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        _init(name);
        _mint(msg.sender, _totalSupply);
    }
}
