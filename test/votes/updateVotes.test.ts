import { expect } from 'chai'
import { BigNumber, constants } from 'ethers'
import { votesFixture } from '../shared/fixtures/votesFixture'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('Votes.updateVotes', () => {
  const loadFixture = setupFixtureLoader()

  it('giver address zero', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    await votes.updateVotes(constants.AddressZero, other.address, expandTo18Decimals(2), overrides)
    expect(await votes.checkpoints(constants.AddressZero, 0)).to.deep.eq([0, BigNumber.from(0)])
    expect(await votes.getCurrentVotes(other.address)).to.eq(expandTo18Decimals(2))
  })

  it('receiver address zero', async () => {
    const { votes, wallet } = await loadFixture(votesFixture)
    await votes.writeCheckpoint(wallet.address, 0, expandTo18Decimals(2), overrides)
    await votes.updateVotes(wallet.address, constants.AddressZero, expandTo18Decimals(2), overrides)
    expect(await votes.checkpoints(constants.AddressZero, 0)).to.deep.eq([0, BigNumber.from(0)])
  })

  it('giver no votes', async () => {
    const { votes, wallet, other } = await loadFixture(votesFixture)
    await expect(votes.updateVotes(other.address, wallet.address, expandTo18Decimals(2), overrides)).to.be.revertedWith(
      'VO_INSUFFICIENT_VOTES'
    )
  })

  it('receiver initial votes', async () => {
    const { votes, wallet, other } = await loadFixture(votesFixture)
    await votes.writeCheckpoint(wallet.address, 0, expandTo18Decimals(10), overrides)

    await votes.updateVotes(wallet.address, other.address, expandTo18Decimals(2), overrides)

    expect(await votes.getCurrentVotes(wallet.address)).to.eq(expandTo18Decimals(8))
    expect(await votes.getCurrentVotes(other.address)).to.eq(expandTo18Decimals(2))
  })

  it('receiver non-zero votes', async () => {
    const { votes, wallet, other } = await loadFixture(votesFixture)
    await votes.writeCheckpoint(wallet.address, 0, expandTo18Decimals(10), overrides)
    await votes.writeCheckpoint(other.address, 0, expandTo18Decimals(10), overrides)

    await votes.updateVotes(wallet.address, other.address, expandTo18Decimals(2), overrides)

    expect(await votes.getCurrentVotes(wallet.address)).to.eq(expandTo18Decimals(8))
    expect(await votes.getCurrentVotes(other.address)).to.deep.eq(expandTo18Decimals(12))
  })

  it('receiver is giver', async () => {
    const { votes, wallet } = await loadFixture(votesFixture)
    const receipt = await (await votes.writeCheckpoint(wallet.address, 0, expandTo18Decimals(4), overrides)).wait()
    await votes.updateVotes(wallet.address, wallet.address, expandTo18Decimals(2), overrides)
    expect(await votes.checkpoints(wallet.address, 0)).to.deep.eq([receipt.blockNumber, expandTo18Decimals(4)])
    expect(await votes.checkpoints(wallet.address, 1)).to.deep.eq([0, BigNumber.from(0)])
  })

  it('votes zero', async () => {
    const { votes, wallet, other } = await loadFixture(votesFixture)
    await votes.writeCheckpoint(wallet.address, 0, expandTo18Decimals(10), overrides)
    await votes.writeCheckpoint(other.address, 0, expandTo18Decimals(10), overrides)

    await votes.updateVotes(wallet.address, other.address, 0, overrides)

    expect(await votes.checkpoints(wallet.address, 1)).to.deep.eq([0, BigNumber.from(0)])
    expect(await votes.checkpoints(other.address, 1)).to.deep.eq([0, BigNumber.from(0)])
  })
})
