// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.7.5;

import '../libraries/Votes.sol';

contract VotesTest is Votes {
    function writeCheckpoint(
        address account,
        uint32 checkpointsNumber,
        uint96 votes
    ) public {
        _writeCheckpoint(account, checkpointsNumber, votes);
    }

    function doubleWriteCheckpoint(
        address account,
        uint32 checkpointsNumber,
        uint96 votes
    ) public {
        _writeCheckpoint(account, checkpointsNumber, votes);
        _writeCheckpoint(account, checkpointsNumber + 1, votes * 2);
    }

    function updateVotes(
        address giver,
        address receiver,
        uint96 votes
    ) public {
        _updateVotes(giver, receiver, votes);
    }

    function getPriorVotes(address account, uint256 blockNumber) public view returns (uint96) {
        return _getPriorVotes(account, blockNumber);
    }
}
