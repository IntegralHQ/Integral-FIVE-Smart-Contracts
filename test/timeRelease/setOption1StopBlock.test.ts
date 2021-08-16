import { BigNumber } from '@ethersproject/bignumber'
import { expect } from 'chai'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralTimeRelease.setOption1StopBlock', () => {
  const loadFixture = setupFixtureLoader()

  it('non owner', async () => {
    const { timeRelease, other } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.connect(other).setOption1StopBlock(BigNumber.from(1))).to.be.revertedWith('TR_FORBIDDEN')
    await expect(
      timeRelease.connect(other).setOption1StopBlock(await timeRelease.option1EndBlock())
    ).to.be.revertedWith('TR_FORBIDDEN')
  })

  it('stop for the past', async () => {
    const { timeRelease, wallet } = await loadFixture(timeReleaseFixture)
    await mineBlocks(wallet, 2)
    await expect(timeRelease.setOption1StopBlock(BigNumber.from(1))).to.be.revertedWith('TR_INVALID_BLOCK_NUMBER')
  })

  it('stop block greater than end block', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.setOption1StopBlock(BigNumber.from(200))).to.be.revertedWith('TR_INVALID_BLOCK_NUMBER')
  })

  it('stop block is end block by default', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    expect(await timeRelease.option1StopBlock()).to.eq(await timeRelease.option1EndBlock())
  })

  it('sets stop block', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    const stopBlockNumber = BigNumber.from(10)
    const tx = await timeRelease.setOption1StopBlock(stopBlockNumber)

    await expect(Promise.resolve(tx)).to.emit(timeRelease, 'Option1StopBlockSet').withArgs(stopBlockNumber)
    expect(await timeRelease.option1StopBlock()).to.eq(stopBlockNumber)
  })

  it('can set only once', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    const stopBlock = BigNumber.from(10)
    await timeRelease.setOption1StopBlock(stopBlock)
    expect(await timeRelease.option1StopBlock()).to.eq(stopBlock)
    await expect(timeRelease.setOption1StopBlock(await timeRelease.option1EndBlock())).to.be.revertedWith(
      'TR_STOP_ALREADY_SET'
    )
  })

  it('limits claimable amount', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([4, 24], [0, 100])
    await setAllocations(wallet, 20, 0)

    await timeRelease.setOption1StopBlock(8)
    await mineBlocks(wallet, 2)
    expect(await timeRelease.getReleasedOption1(wallet.address)).to.eq(expandTo18Decimals(4))
  })
})
