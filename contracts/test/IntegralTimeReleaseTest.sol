// SPDX-License-Identifier: GPL-3.0-or-later
// Deployed with donations via Gitcoin GR9

pragma solidity 0.7.5;

import '../IntegralTimeRelease.sol';

contract IntegralTimeReleaseTest is IntegralTimeRelease {
    constructor(
        address _token,
        uint256 _option1StartBlock,
        uint256 _option1EndBlock,
        uint256 _option2StartBlock,
        uint256 _option2EndBlock
    ) IntegralTimeRelease(_token, _option1StartBlock, _option1EndBlock, _option2StartBlock, _option2EndBlock) {}

    function setOption1Timeframe(uint256 _option1StartBlock, uint256 _option1EndBlock) public {
        _setOption1Timeframe(_option1StartBlock, _option1EndBlock);
    }

    function setOption2Timeframe(uint256 _option2StartBlock, uint256 _option2EndBlock) public {
        _setOption2Timeframe(_option2StartBlock, _option2EndBlock);
    }
}
