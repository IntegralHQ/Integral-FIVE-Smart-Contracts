import { Wallet } from '@ethersproject/wallet'
import { expect } from 'chai'
import { IntegralTimeRelease__factory } from '../../build/types'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlock, mineBlocks } from '../shared/utilities'

describe('IntegralTimeRelease', () => {
  const loadFixture = setupFixtureLoader()

  it('owner is deployer by default', async () => {
    const { timeRelease, wallet } = await loadFixture(timeReleaseFixture)
    expect(await timeRelease.owner()).to.eq(wallet.address)
  })

  it('can set owner', async () => {
    const { timeRelease, other } = await loadFixture(timeReleaseFixture)
    const tx = await timeRelease.setOwner(other.address)
    await expect(Promise.resolve(tx)).to.emit(timeRelease, 'OwnerSet').withArgs(other.address)
    expect(await timeRelease.owner()).to.eq(other.address)
  })

  it('token is set', async () => {
    const { timeRelease, token } = await loadFixture(timeReleaseFixture)
    expect(await timeRelease.token()).to.eq(token.address)
  })

  it('start and end blocks for options are set', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    expect(await timeRelease.option1StartBlock()).to.eq(0)
    expect(await timeRelease.option1EndBlock()).to.eq(100)
    expect(await timeRelease.option2StartBlock()).to.eq(0)
    expect(await timeRelease.option2EndBlock()).to.eq(100)
  })

  it('option end block later than start block', async () => {
    const { wallet, token } = await loadFixture(timeReleaseFixture)
    await expect(new IntegralTimeRelease__factory(wallet).deploy(token.address, 20, 10, 10, 20)).to.be.revertedWith(
      'INVALID_OPTION1_TIME_FRAME'
    )
    await expect(new IntegralTimeRelease__factory(wallet).deploy(token.address, 10, 20, 20, 10)).to.be.revertedWith(
      'INVALID_OPTION2_TIME_FRAME'
    )
  })

  it('general functionality', async () => {
    const { timeRelease, token, wallet, other, another, setupTimeRelease } = await loadFixture(timeReleaseFixture)

    async function claimAndExpect(_wallet: Wallet, expected: number, times = 1) {
      const balanceBefore = await token.balanceOf(_wallet.address)
      for (let i = 0; i < times; i++) {
        await timeRelease.connect(_wallet).claim(_wallet.address)
      }
      const balanceAfter = await token.balanceOf(_wallet.address)
      expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(expected))
    }

    const setAllocations = await setupTimeRelease([10, 30], [20, 50])
    await setAllocations(wallet, 80, 240)
    await setAllocations(other, 200, 300)
    await setAllocations(another, 200, 300)

    await expect(timeRelease.initOption1Allocations([other.address], [expandTo18Decimals(40)])).to.be.revertedWith(
      'TR_ALLOCATION_ALREADY_SET'
    )
    await expect(timeRelease.setOption1StopBlock(10)).to.be.revertedWith('TR_INVALID_BLOCK_NUMBER')

    let balanceBefore = await token.balanceOf(wallet.address)
    await timeRelease.setOption1StopBlock(25)
    await timeRelease.setOption2StopBlock(30)
    await timeRelease.skim(wallet.address)
    let balanceAfter = await token.balanceOf(wallet.address)

    expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(680))

    await claimAndExpect(other, 70)

    balanceBefore = await token.balanceOf(wallet.address)
    await mineBlock(wallet)
    await timeRelease.claim(wallet.address)
    await mineBlocks(wallet, 3)
    await timeRelease.claim(wallet.address)
    balanceAfter = await token.balanceOf(wallet.address)
    expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(76))

    await mineBlocks(wallet, 3)

    await claimAndExpect(another, 220)
    await mineBlock(wallet)
    await claimAndExpect(other, 180, 4)

    await mineBlocks(wallet, 2)

    await claimAndExpect(wallet, 64)
    await claimAndExpect(another, 30)

    expect(await timeRelease.option1TotalAllocations()).to.eq(expandTo18Decimals(480))
    expect(await timeRelease.option2TotalAllocations()).to.eq(expandTo18Decimals(840))
    expect(await timeRelease.option1TotalClaimed()).to.eq(expandTo18Decimals(360))
    expect(await timeRelease.option2TotalClaimed()).to.eq(expandTo18Decimals(280))
  })
})
