import { BigNumber } from '@ethersproject/bignumber'
import { expect } from 'chai'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralTimeRelease.setOption2StopBlock', () => {
  const loadFixture = setupFixtureLoader()

  it('non owner', async () => {
    const { timeRelease, other } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.connect(other).setOption2StopBlock(BigNumber.from(1))).to.be.revertedWith('TR_FORBIDDEN')
    await expect(
      timeRelease.connect(other).setOption2StopBlock(await timeRelease.option2EndBlock())
    ).to.be.revertedWith('TR_FORBIDDEN')
  })

  it('stop for the past', async () => {
    const { timeRelease, wallet } = await loadFixture(timeReleaseFixture)
    await mineBlocks(wallet, 2)
    await expect(timeRelease.setOption2StopBlock(BigNumber.from(1))).to.be.revertedWith('TR_INVALID_BLOCK_NUMBER')
  })

  it('stop block greater than end block', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.setOption2StopBlock(BigNumber.from(200))).to.be.revertedWith('TR_INVALID_BLOCK_NUMBER')
  })

  it('stop block is end block by default', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    expect(await timeRelease.option2StopBlock()).to.eq(await timeRelease.option2EndBlock())
  })

  it('sets stop block', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    const stopBlockNumber = BigNumber.from(10)
    const tx = await timeRelease.setOption2StopBlock(stopBlockNumber)

    await expect(Promise.resolve(tx)).to.emit(timeRelease, 'Option2StopBlockSet').withArgs(stopBlockNumber)

    expect(await timeRelease.option2StopBlock()).to.eq(stopBlockNumber)
  })

  it('can set only once', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    const stopBlock = BigNumber.from(10)
    await timeRelease.setOption2StopBlock(stopBlock)
    expect(await timeRelease.option2StopBlock()).to.eq(stopBlock)
    await expect(timeRelease.setOption2StopBlock(await timeRelease.option2EndBlock())).to.be.revertedWith(
      'TR_STOP_ALREADY_SET'
    )
  })

  it('limits claimable amount', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 100], [4, 24])
    await setAllocations(wallet, 0, 20)

    await timeRelease.setOption2StopBlock(8)
    await mineBlocks(wallet, 2)
    expect(await timeRelease.getReleasedOption2(wallet.address)).to.eq(expandTo18Decimals(4))
  })
})
