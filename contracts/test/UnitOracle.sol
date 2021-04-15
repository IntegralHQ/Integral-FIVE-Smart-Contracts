// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../libraries/SafeMath.sol';

contract UnitOracle {
    using SafeMath for uint256;
    event UpdatePrice();

    uint32 public epoch = 2137;

    function updateEpoch() public {
        epoch += 1;
    }

    function updatePrice() public returns (uint32) {
        emit UpdatePrice();
        return epoch;
    }

    function tradeX(
        uint256 xAfter,
        uint256 xBefore,
        uint256 yBefore
    ) public pure returns (uint256 yAfter) {
        if (xAfter > xBefore) {
            return yBefore.sub(xAfter.sub(xBefore));
        } else {
            return yBefore.add(xBefore.sub(xAfter));
        }
    }

    function tradeY(
        uint256 yAfter,
        uint256 xBefore,
        uint256 yBefore
    ) public pure returns (uint256 xAfter) {
        if (yAfter > yBefore) {
            return xBefore.sub(yAfter.sub(yBefore));
        } else {
            return xBefore.add(yBefore.sub(yAfter));
        }
    }

    function getSpotPrice(uint256, uint256) public pure returns (uint256) {
        return 10**18;
    }
}
