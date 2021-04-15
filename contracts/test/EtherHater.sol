// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../interfaces/IIntegralDelay.sol';

contract EtherHater {
    function callExecute(IIntegralDelay delay) external {
        delay.execute(1);
    }

    receive() external payable {
        revert('EtherHater: NOPE_SORRY');
    }
}
