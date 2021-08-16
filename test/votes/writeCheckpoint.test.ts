import { setupFixtureLoader } from '../shared/setup'
import { votesFixture } from '../shared/fixtures/votesFixture'
import { expandTo18Decimals, overrides } from '../shared/utilities'
import { expect } from 'chai'
import { BigNumber } from '@ethersproject/bignumber'

describe('Votes.writeCheckpoint', () => {
  const loadFixture = setupFixtureLoader()

  it('adds new checkpoint', async () => {
    const { votes, wallet } = await loadFixture(votesFixture)
    const votesNumber = expandTo18Decimals(4)

    const tx = await votes.writeCheckpoint(wallet.address, 0, votesNumber, overrides)
    await expect(Promise.resolve(tx)).to.emit(votes, 'DelegateVotesChanged').withArgs(wallet.address, 0, votesNumber)

    const receipt = await tx.wait()
    expect(await votes.checkpoints(wallet.address, 0)).to.deep.eq([receipt.blockNumber, votesNumber])
    expect(await votes.checkpointsLength(wallet.address)).to.eq(1)
  })

  it('increases votes if checkpoint exists', async () => {
    const { votes, wallet } = await loadFixture(votesFixture)
    const votesNumber = expandTo18Decimals(4)

    const tx = await votes.doubleWriteCheckpoint(wallet.address, 0, votesNumber)
    await expect(Promise.resolve(tx)).to.emit(votes, 'DelegateVotesChanged').withArgs(wallet.address, 0, votesNumber)

    const receipt = await tx.wait()
    expect(await votes.checkpoints(wallet.address, 0)).to.deep.eq([receipt.blockNumber, votesNumber.mul(2)])
    expect(await votes.checkpointsLength(wallet.address)).to.eq(1)
  })

  it('performs adding different checkpoints', async () => {
    const { votes, wallet } = await loadFixture(votesFixture)

    let oldVotesNumber = expandTo18Decimals(0)
    let votesNumber = expandTo18Decimals(4)
    let tx = await votes.writeCheckpoint(wallet.address, 0, votesNumber)
    let receipt = await tx.wait()

    await expect(Promise.resolve(tx))
      .to.emit(votes, 'DelegateVotesChanged')
      .withArgs(wallet.address, oldVotesNumber, votesNumber)
    expect(await votes.checkpoints(wallet.address, 0)).to.deep.eq([receipt.blockNumber, votesNumber])
    expect(await votes.checkpointsLength(wallet.address)).to.eq(1)

    oldVotesNumber = BigNumber.from(votesNumber)
    votesNumber = expandTo18Decimals(3)
    const votesNumberMultiplied = votesNumber.mul(2)
    tx = await votes.doubleWriteCheckpoint(wallet.address, 1, votesNumber)
    receipt = await tx.wait()

    await expect(Promise.resolve(tx))
      .to.emit(votes, 'DelegateVotesChanged')
      .withArgs(wallet.address, oldVotesNumber, votesNumber)
      .to.emit(votes, 'DelegateVotesChanged')
      .withArgs(wallet.address, votesNumber, votesNumberMultiplied)
    expect(await votes.checkpoints(wallet.address, 1)).to.deep.eq([receipt.blockNumber, votesNumberMultiplied])
    expect(await votes.checkpointsLength(wallet.address)).to.eq(2)

    oldVotesNumber = BigNumber.from(votesNumberMultiplied)
    votesNumber = expandTo18Decimals(12)
    tx = await votes.writeCheckpoint(wallet.address, 2, votesNumber)
    receipt = await tx.wait()

    await expect(Promise.resolve(tx))
      .to.emit(votes, 'DelegateVotesChanged')
      .withArgs(wallet.address, oldVotesNumber, votesNumber)
    expect(await votes.checkpoints(wallet.address, 2)).to.deep.eq([receipt.blockNumber, votesNumber])
    expect(await votes.checkpointsLength(wallet.address)).to.eq(3)
  })
})
