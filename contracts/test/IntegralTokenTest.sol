// SPDX-License-Identifier: GPL-3.0-or-later
// Deployed with donations via Gitcoin GR9

pragma solidity 0.7.5;

import '../IntegralToken.sol';

contract IntegralTokenTest is IntegralToken {
    constructor(address account, uint256 _initialAmount) IntegralToken(account, _initialAmount) {}

    function burnOnAddress(address account) public {
        balances[account] = 0;
    }
}
