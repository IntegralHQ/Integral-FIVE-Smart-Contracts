import { expect } from 'chai'
import { providers, Wallet } from 'ethers'
import { votesFixture } from '../shared/fixtures/votesFixture'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlock } from '../shared/utilities'

describe('Votes.getPriorVotes', async () => {
  const loadFixture = setupFixtureLoader()

  it('exceeds blockNumber', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    const blockNumber = await getCurrentBlockNumber(other)

    await expect(votes.getPriorVotes(other.address, blockNumber + 1)).to.be.revertedWith('VO_NOT_YET_DETERMINED')
  })

  it('no votes history', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    const blockNumber = await getCurrentBlockNumber(other)

    expect(await votes.getPriorVotes(other.address, blockNumber - 1)).to.eq(0)
  })

  it('no votes at checking time', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    const otherBlockNumber = await getTxBlockNumber(
      await votes.writeCheckpoint(other.address, 0, expandTo18Decimals(10))
    )

    expect(await votes.getPriorVotes(other.address, otherBlockNumber - 1)).to.eq(0)
  })

  it('one checkpoint', async () => {
    const { votes, wallet } = await loadFixture(votesFixture)
    const initialVotes = await votes.getCurrentVotes(wallet.address)
    await mineBlock(wallet)

    expect(await votes.getPriorVotes(wallet.address, 1)).to.eq(initialVotes)
  })

  it('two checkpoints, gets first', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    const firstCheckpointVotes = expandTo18Decimals(1)
    const firstBlockNumber = await getTxBlockNumber(await votes.writeCheckpoint(other.address, 0, firstCheckpointVotes))
    await votes.writeCheckpoint(other.address, 1, expandTo18Decimals(2))

    expect(await votes.getPriorVotes(other.address, firstBlockNumber)).to.eq(firstCheckpointVotes)
  })

  it('two checkpoints, gets last', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    await votes.writeCheckpoint(other.address, 0, expandTo18Decimals(1))
    const lastCheckpointVotes = expandTo18Decimals(2)
    const lastBlockNumber = await getTxBlockNumber(await votes.writeCheckpoint(other.address, 1, lastCheckpointVotes))
    await mineBlock(other)

    expect(await votes.getPriorVotes(other.address, lastBlockNumber)).to.eq(lastCheckpointVotes)
  })

  it('many checkpoints, gets first', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    const firstCheckpointVotes = expandTo18Decimals(1)
    const firstBlockNumber = await getTxBlockNumber(await votes.writeCheckpoint(other.address, 0, firstCheckpointVotes))
    await votes.writeCheckpoint(other.address, 1, expandTo18Decimals(2))
    await votes.writeCheckpoint(other.address, 2, expandTo18Decimals(3))
    await votes.writeCheckpoint(other.address, 3, expandTo18Decimals(4))
    await votes.writeCheckpoint(other.address, 4, expandTo18Decimals(5))

    expect(await votes.getPriorVotes(other.address, firstBlockNumber)).to.eq(firstCheckpointVotes)
  })

  it('many checkpoints, gets last', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    await votes.writeCheckpoint(other.address, 0, expandTo18Decimals(1))
    await votes.writeCheckpoint(other.address, 1, expandTo18Decimals(2))
    await votes.writeCheckpoint(other.address, 2, expandTo18Decimals(3))
    await votes.writeCheckpoint(other.address, 3, expandTo18Decimals(4))
    const lastCheckpointVotes = expandTo18Decimals(5)
    const lastBlockNumber = await getTxBlockNumber(await votes.writeCheckpoint(other.address, 4, lastCheckpointVotes))
    await mineBlock(other)

    expect(await votes.getPriorVotes(other.address, lastBlockNumber)).to.eq(lastCheckpointVotes)
  })

  it('even checkpoints number', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    await votes.writeCheckpoint(other.address, 0, expandTo18Decimals(1))
    await votes.writeCheckpoint(other.address, 1, expandTo18Decimals(2))
    await votes.writeCheckpoint(other.address, 2, expandTo18Decimals(3))
    const votesNumber = expandTo18Decimals(4)
    const blockNumber = await getTxBlockNumber(await votes.writeCheckpoint(other.address, 3, votesNumber))
    await votes.writeCheckpoint(other.address, 4, expandTo18Decimals(5))
    await votes.writeCheckpoint(other.address, 5, expandTo18Decimals(6))

    expect(await votes.getPriorVotes(other.address, blockNumber)).to.eq(votesNumber)
  })

  it('odd checkpoints number', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    await votes.writeCheckpoint(other.address, 0, expandTo18Decimals(1))
    await votes.writeCheckpoint(other.address, 1, expandTo18Decimals(2))
    await votes.writeCheckpoint(other.address, 2, expandTo18Decimals(3))
    const votesNumber = expandTo18Decimals(4)
    const blockNumber = await getTxBlockNumber(await votes.writeCheckpoint(other.address, 3, votesNumber))
    await votes.writeCheckpoint(other.address, 4, expandTo18Decimals(5))

    expect(await votes.getPriorVotes(other.address, blockNumber)).to.eq(votesNumber)
  })
})

async function getCurrentBlockNumber(wallet: Wallet) {
  return await getTxBlockNumber(mineBlock(wallet))
}

async function getTxBlockNumber(tx: providers.TransactionResponse | Promise<providers.TransactionResponse>) {
  return (await (await tx).wait()).blockNumber
}
