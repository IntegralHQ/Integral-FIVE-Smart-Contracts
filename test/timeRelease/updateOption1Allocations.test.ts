import { expect } from 'chai'
import { BigNumber, utils, Wallet } from 'ethers'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlock, overrides } from '../shared/utilities'

describe('IntegralTimeRelease.updateOption1Allocations', () => {
  const loadFixture = setupFixtureLoader()

  it('non owner', async () => {
    const { timeRelease, other } = await loadFixture(timeReleaseFixture)
    await expect(
      timeRelease.connect(other).updateOption1Allocations([other.address], [expandTo18Decimals(1)])
    ).to.be.revertedWith('TR_FORBIDDEN')
  })

  it('no allocation to update', async () => {
    const { timeRelease, other } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.updateOption1Allocations([other.address], [expandTo18Decimals(1)])).to.be.revertedWith(
      'TR_ALLOCATION_NOT_SET'
    )
  })

  it('different input lengths', async () => {
    const { timeRelease, other } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.updateOption1Allocations([other.address], [1, 1])).to.be.revertedWith('TR_INVALID_LENGTHS')
  })

  it('after skim', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 10], [0, 10])
    await setAllocations(wallet, 10, 0)

    await timeRelease.setOption1StopBlock(8)
    await timeRelease.skim(wallet.address, overrides)
    await expect(timeRelease.updateOption1Allocations([], [], overrides)).to.be.revertedWith('TR_STOP_ALREADY_SET')
  })

  it('insufficient contract balance', async () => {
    const { timeRelease, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 10], [0, 10])
    await setAllocations(other, 10, 0)

    await expect(
      timeRelease.updateOption1Allocations([other.address], [expandTo18Decimals(100)], overrides)
    ).to.be.revertedWith('TR_INSUFFICIENT_BALANCE')
  })

  it('after claim', async () => {
    const { timeRelease, token, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([5, 15], [0, 100])
    await setAllocations(other, 10, 0)

    await token.burnOnAddress(timeRelease.address)
    await token.mint(timeRelease.address, expandTo18Decimals(10))
    const tx = await timeRelease.connect(other).claim(other.address)
    const afterClaimBlockNumber = (await tx.wait()).blockNumber
    await mineBlock(other)
    expect(await timeRelease.getPriorVotes(other.address, afterClaimBlockNumber - 1)).to.eq(expandTo18Decimals(10))
    expect(await timeRelease.getPriorVotes(other.address, afterClaimBlockNumber)).to.eq(expandTo18Decimals(6))
    await expect(
      timeRelease.updateOption1Allocations([other.address], [expandTo18Decimals(11)], overrides)
    ).to.be.revertedWith('TR_INSUFFICIENT_BALANCE')
    await token.mint(timeRelease.address, expandTo18Decimals(1))
    const updateTx = await timeRelease.updateOption1Allocations([other.address], [expandTo18Decimals(11)], overrides)
    const updateBlockNumber = (await updateTx.wait()).blockNumber
    await mineBlock(other)
    expect(await timeRelease.getPriorVotes(other.address, updateBlockNumber)).to.eq(expandTo18Decimals(7))
    expect(await timeRelease.getOption1Allocation(other.address)).to.eq(expandTo18Decimals(11))
  })

  it('less than released', async () => {
    const { timeRelease, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 10], [0, 100])
    await setAllocations(other, 100, 0)
    await expect(timeRelease.updateOption1Allocations([other.address], [expandTo18Decimals(1)])).to.be.revertedWith(
      'TR_ALLOCATION_TOO_SMALL'
    )
  })

  it('changes allocation and votes', async () => {
    const { timeRelease, token, wallet, other, another, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 30], [0, 100])
    await setAllocations(wallet, 20, 0)
    await setAllocations(other, 15, 0)
    await setAllocations(another, 15, 0)
    expect(await timeRelease.getOption1Allocation(wallet.address)).to.eq(expandTo18Decimals(20))
    expect(await timeRelease.getOption1Allocation(other.address)).to.eq(expandTo18Decimals(15))
    expect(await timeRelease.getOption1Allocation(another.address)).to.eq(expandTo18Decimals(15))
    expect(await timeRelease.option1TotalAllocations()).to.eq(expandTo18Decimals(50))

    await token.mint(timeRelease.address, expandTo18Decimals(51))
    const tx = await timeRelease.updateOption1Allocations(
      [wallet.address, other.address, another.address],
      [expandTo18Decimals(11), expandTo18Decimals(10), expandTo18Decimals(30)]
    )
    const blockNumber = (await tx.wait()).blockNumber
    await mineBlock(wallet)
    expect(await timeRelease.getOption1Allocation(wallet.address)).to.eq(expandTo18Decimals(11))
    expect(await timeRelease.getOption1Allocation(other.address)).to.eq(expandTo18Decimals(10))
    expect(await timeRelease.getOption1Allocation(another.address)).to.eq(expandTo18Decimals(30))
    expect(await timeRelease.getPriorVotes(wallet.address, blockNumber)).to.eq(expandTo18Decimals(11))
    expect(await timeRelease.getPriorVotes(other.address, blockNumber)).to.eq(expandTo18Decimals(10))
    expect(await timeRelease.getPriorVotes(another.address, blockNumber)).to.eq(expandTo18Decimals(30))
    expect(await timeRelease.option1TotalAllocations()).to.eq(expandTo18Decimals(51))
  })

  it('multiple changes', async () => {
    const { timeRelease, token } = await loadFixture(timeReleaseFixture)
    const wallets = [...new Array(10)].map(() => Wallet.createRandom().address)
    const initialAmounts = new Array(10).fill(expandTo18Decimals(1))
    const newAmounts = [...new Array(10)].map(() => utils.parseUnits(Math.floor(Math.random() * 10 + 10).toString()))

    await token.mint(timeRelease.address, expandTo18Decimals(200), overrides)
    await timeRelease.initOption1Allocations(wallets, initialAmounts, overrides)
    await timeRelease.updateOption1Allocations(wallets, newAmounts, overrides)

    for (let i = 0; i < wallets.length; i++) {
      expect(await timeRelease.getOption1Allocation(wallets[i])).to.eq(newAmounts[i])
    }
    expect(await timeRelease.option1TotalAllocations()).to.eq(
      newAmounts.reduce((acc: BigNumber, curr: BigNumber) => acc.add(curr), BigNumber.from(0))
    )
  })
})
