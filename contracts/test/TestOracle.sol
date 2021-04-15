// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import '../IntegralOracle.sol';

contract TestOracle is IntegralOracle {
    constructor(uint8 _xDecimals, uint8 _yDecimals) IntegralOracle(_xDecimals, _yDecimals) {}

    function setPrice(int256 _price) public {
        require(msg.sender == owner, 'IO_FORBIDDEN');
        require(price >= 0, 'IO_NEGATIVE_PRICE');
        price = _price;
        epoch += 1; // overflow is desired
    }
}
