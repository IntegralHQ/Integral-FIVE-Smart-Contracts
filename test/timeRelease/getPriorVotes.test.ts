import { BigNumber } from '@ethersproject/bignumber'
import { expect } from 'chai'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralTimeRelease.getPriorVotes', () => {
  const loadFixture = setupFixtureLoader()

  it('initial', async () => {
    const { timeRelease, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)

    expect(await timeRelease.getPriorVotes(other.address, 0)).to.eq(BigNumber.from(0))

    const setAllocations = await setupTimeRelease([0, 100], [8, 18])
    await setAllocations(other, 0, 10)
    await mineBlocks(other, 3)
    expect(await timeRelease.getPriorVotes(other.address, 9)).to.eq(expandTo18Decimals(10))
    expect(await timeRelease.getPriorVotes(other.address, 1)).to.eq(BigNumber.from(0))
  })

  it('stop block', async () => {
    const { timeRelease, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([8, 18], [9, 19])
    await setAllocations(other, 10, 10)
    await mineBlocks(other, 3)
    expect(await timeRelease.getPriorVotes(other.address, 9)).to.eq(expandTo18Decimals(20))

    const option1StopTx = await timeRelease.setOption1StopBlock(13)
    const option1StopBlockNumber = (await option1StopTx.wait()).blockNumber
    expect(await timeRelease.getPriorVotes(other.address, option1StopBlockNumber - 1)).to.eq(expandTo18Decimals(20))
    expect(await timeRelease.getPriorVotes(other.address, option1StopBlockNumber)).to.eq(expandTo18Decimals(15))
    await mineBlocks(other, 2)
    const option2StopTx = await timeRelease.setOption2StopBlock(14)
    const option2StopBlockNumber = (await option2StopTx.wait()).blockNumber
    expect(await timeRelease.getPriorVotes(other.address, option2StopBlockNumber - 1)).to.eq(expandTo18Decimals(15))
    expect(await timeRelease.getPriorVotes(other.address, option2StopBlockNumber)).to.eq(expandTo18Decimals(10))
    await mineBlocks(other, 10)
    const currentBlock = await other.provider.getBlockNumber()
    expect(await timeRelease.getPriorVotes(other.address, currentBlock)).to.eq(expandTo18Decimals(10))
  })

  it('blockNumber before checkpoints and inits', async () => {
    const { timeRelease, token, other } = await loadFixture(timeReleaseFixture)
    await mineBlocks(other, 3)
    const tx = await timeRelease.connect(other).claim(other.address)
    const blockNumber = (await tx.wait()).blockNumber
    const allocation = expandTo18Decimals(10)
    await token.mint(timeRelease.address, allocation.mul(2))
    await timeRelease.initOption1Allocations([other.address], [allocation])
    await timeRelease.initOption2Allocations([other.address], [allocation])
    expect(await timeRelease.getPriorVotes(other.address, blockNumber - 1)).to.eq(BigNumber.from(0))
  })

  it('blockNumber after inits, before checkpoint', async () => {
    const { timeRelease, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([8, 18], [9, 19])
    await setAllocations(other, 10, 10)
    await mineBlocks(other, 3)
    const tx = await timeRelease.connect(other).claim(other.address)
    const blockNumber = (await tx.wait()).blockNumber
    expect(await timeRelease.getPriorVotes(other.address, blockNumber - 1)).to.eq(expandTo18Decimals(20))
  })

  it('blockNumber after checkpoint, before inits', async () => {
    const { timeRelease, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    await mineBlocks(other, 2)
    const tx = await timeRelease.connect(other).claim(other.address)
    const blockNumber = (await tx.wait()).blockNumber
    await mineBlocks(other, 2)
    const setAllocations = await setupTimeRelease([10, 20], [20, 30])
    await setAllocations(other, 10, 10)
    expect(await timeRelease.getPriorVotes(other.address, blockNumber + 1)).to.eq(BigNumber.from(0))
  })

  it('blockNumber after first init, before checkpoint', async () => {
    const { timeRelease, token, other } = await loadFixture(timeReleaseFixture)
    const allocation = expandTo18Decimals(10)
    await token.mint(timeRelease.address, allocation.mul(2))
    await timeRelease.initOption1Allocations([other.address], [allocation])
    await mineBlocks(other, 2)
    const tx = await timeRelease.connect(other).claim(other.address)
    const blockNumber = (await tx.wait()).blockNumber
    await timeRelease.initOption2Allocations([other.address], [allocation])
    expect(await timeRelease.getPriorVotes(other.address, blockNumber - 1)).to.eq(expandTo18Decimals(10))
  })

  it('blockNumber after checkpoint, before second init', async () => {
    const { timeRelease, token, other } = await loadFixture(timeReleaseFixture)
    const allocation = expandTo18Decimals(10)
    await token.mint(timeRelease.address, allocation.mul(2))
    await timeRelease.initOption1Allocations([other.address], [allocation])
    const tx = await timeRelease.connect(other).claim(other.address)
    const blockNumber = (await tx.wait()).blockNumber
    await mineBlocks(other, 2)
    await timeRelease.initOption2Allocations([other.address], [allocation])
    const option1Claimed = await timeRelease.getOption1Claimed(other.address)
    expect(await timeRelease.getPriorVotes(other.address, blockNumber + 1)).to.eq(allocation.sub(option1Claimed))
  })
})
