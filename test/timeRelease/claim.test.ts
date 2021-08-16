import { expect } from 'chai'
import { setupFixtureLoader } from '../shared/setup'
import { timeReleaseFixture } from '../shared/fixtures'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'
import { BigNumber } from '@ethersproject/bignumber'

describe('IntegralTimeRelease.claim', () => {
  const loadFixture = setupFixtureLoader()

  it('no allocation', async () => {
    const { timeRelease, wallet } = await loadFixture(timeReleaseFixture)
    await timeRelease.claim(wallet.address)
    expect(await timeRelease.getOption1Claimed(wallet.address)).to.eq(0)
    expect(await timeRelease.getOption2Claimed(wallet.address)).to.eq(0)
  })

  it('no tokens in contract', async () => {
    const { timeRelease, token, wallet } = await loadFixture(timeReleaseFixture)
    const amount = expandTo18Decimals(10)
    await token.mint(timeRelease.address, amount)
    await timeRelease.initOption1Allocations([wallet.address], [amount])
    await token.burnOnAddress(timeRelease.address)
    await expect(timeRelease.claim(wallet.address)).to.be.revertedWith('TH_TRANSFER_FAILED')
  })

  it('transfers tokens', async () => {
    const { timeRelease, wallet, other, token, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([2, 12], [3, 13])
    await setAllocations(wallet, 10, 10)

    const balanceBefore = await token.balanceOf(other.address)
    await timeRelease.claim(other.address)
    const balanceAfter = await token.balanceOf(other.address)
    expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(11))
  })

  it('can claim one option when the other is ended', async () => {
    const { timeRelease, wallet, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([2, 6], [3, 13])
    await setAllocations(wallet, 10, 10)

    await expect(timeRelease.claim(other.address))
      .to.emit(timeRelease, 'Claim')
      .withArgs(wallet.address, other.address, expandTo18Decimals(10), expandTo18Decimals(5))

    await mineBlocks(wallet, 3)

    await expect(timeRelease.claim(other.address))
      .to.emit(timeRelease, 'Claim')
      .withArgs(wallet.address, other.address, BigNumber.from(0), expandTo18Decimals(4))

    expect(await timeRelease.getOption1Claimed(wallet.address)).to.eq(expandTo18Decimals(10))
    expect(await timeRelease.getOption2Claimed(wallet.address)).to.eq(expandTo18Decimals(9))

    await mineBlocks(wallet, 2)
    await timeRelease.claim(other.address)
    expect(await timeRelease.getOption2Claimed(wallet.address)).to.eq(expandTo18Decimals(10))
  })

  it('updates claimed amount and votes', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([2, 12], [3, 13])
    await setAllocations(wallet, 10, 10)

    const tx = await timeRelease.claim(wallet.address)
    const expectedOption1Claimed = expandTo18Decimals(6)
    const expectedOption2Claimed = expandTo18Decimals(5)

    await expect(Promise.resolve(tx))
      .to.emit(timeRelease, 'Claim')
      .withArgs(wallet.address, wallet.address, expectedOption1Claimed, expectedOption2Claimed)
    expect(await timeRelease.getOption1Claimed(wallet.address)).to.eq(expectedOption1Claimed)
    expect(await timeRelease.getOption2Claimed(wallet.address)).to.eq(expectedOption2Claimed)
    expect(await timeRelease.getCurrentVotes(wallet.address)).to.eq(expandTo18Decimals(9))
  })

  it('updates total claimed amount', async () => {
    const { timeRelease, wallet, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([2, 12], [3, 13])

    await setAllocations(wallet, 10, 15)
    await setAllocations(other, 20, 25)
    await timeRelease.claim(other.address)
    await timeRelease.connect(other).claim(wallet.address)

    const walletOption1Claimed = await timeRelease.getOption1Claimed(wallet.address)
    const walletOption2Claimed = await timeRelease.getOption2Claimed(wallet.address)
    const otherOption1Claimed = await timeRelease.getOption1Claimed(other.address)
    const otherOption2Claimed = await timeRelease.getOption2Claimed(other.address)

    expect(await timeRelease.option1TotalClaimed()).to.eq(walletOption1Claimed.add(otherOption1Claimed))
    expect(await timeRelease.option2TotalClaimed()).to.eq(walletOption2Claimed.add(otherOption2Claimed))
  })

  it('multiple claims', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([7, 17], [3, 23])
    await setAllocations(wallet, 10, 20)

    await timeRelease.claim(wallet.address)
    expect(await timeRelease.getOption1Claimed(wallet.address)).to.eq(expandTo18Decimals(1))
    expect(await timeRelease.getOption2Claimed(wallet.address)).to.eq(expandTo18Decimals(5))

    await mineBlocks(wallet, 3)
    await timeRelease.claim(wallet.address)
    expect(await timeRelease.getOption1Claimed(wallet.address)).to.eq(expandTo18Decimals(5))
    expect(await timeRelease.getOption2Claimed(wallet.address)).to.eq(expandTo18Decimals(9))

    await mineBlocks(wallet, 2)
    await timeRelease.claim(wallet.address)
    expect(await timeRelease.getOption1Claimed(wallet.address)).to.eq(expandTo18Decimals(8))
    expect(await timeRelease.getOption2Claimed(wallet.address)).to.eq(expandTo18Decimals(12))

    await mineBlocks(wallet, 3)
    await timeRelease.claim(wallet.address)
    expect(await timeRelease.getOption1Claimed(wallet.address)).to.eq(expandTo18Decimals(10))
    expect(await timeRelease.getOption2Claimed(wallet.address)).to.eq(expandTo18Decimals(16))
  })

  it('claim after changing end block', async () => {
    const { timeRelease, other, token, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([6, 16], [4, 24])
    await setAllocations(other, 10, 20)

    const balanceBefore = await token.balanceOf(other.address)
    await timeRelease.connect(other).claim(other.address)

    await timeRelease.setOption1Timeframe(6, 10)
    await timeRelease.setOption2Timeframe(4, 14)

    await mineBlocks(other, 6)

    await timeRelease.connect(other).claim(other.address)
    const balanceAfter = await token.balanceOf(other.address)
    expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(30))
  })

  it('after skim', async () => {
    const { timeRelease, wallet, other, token, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 20], [0, 30])
    await setAllocations(other, 20, 60)

    await timeRelease.setOption1StopBlock(10)
    await timeRelease.setOption2StopBlock(10)

    await timeRelease.skim(wallet.address)

    const balanceBefore = await token.balanceOf(other.address)
    await timeRelease.connect(other).claim(other.address)
    const balanceAfter = await token.balanceOf(other.address)
    expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(30))
  })
})
