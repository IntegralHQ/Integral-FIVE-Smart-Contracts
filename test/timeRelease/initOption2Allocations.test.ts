import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { Wallet, utils, BigNumber } from 'ethers'
import { expect } from 'chai'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralTimeRelease.initOption2Allocations', () => {
  const loadFixture = setupFixtureLoader()

  it('non owner', async () => {
    const { timeRelease, other } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.connect(other).initOption2Allocations([], [], overrides)).to.be.revertedWith(
      'TR_FORBIDDEN'
    )
  })

  it('different inputs lengths ', async () => {
    const { timeRelease, wallet, other } = await loadFixture(timeReleaseFixture)
    await expect(
      timeRelease.initOption2Allocations([wallet.address, other.address], [1], overrides)
    ).to.be.revertedWith('TR_INVALID_LENGTHS')
  })

  it('after skim', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 10], [0, 10])
    await setAllocations(wallet, 10, 0)

    await timeRelease.setOption2StopBlock(8)
    await timeRelease.skim(wallet.address, overrides)
    await expect(timeRelease.initOption2Allocations([], [], overrides)).to.be.revertedWith('TR_STOP_ALREADY_SET')
  })

  it('sets allocations and votes', async () => {
    const { timeRelease, token } = await loadFixture(timeReleaseFixture)
    const wallets = [...new Array(10)].map(() => Wallet.createRandom().address)
    const amounts = [...new Array(10)].map(() => utils.parseUnits(Math.floor(Math.random() * 10 + 1).toString()))
    const totalAllocation = amounts.reduce((acc: BigNumber, curr: BigNumber) => acc.add(curr), BigNumber.from(0))

    await token.mint(timeRelease.address, totalAllocation)
    const tx = await timeRelease.initOption2Allocations(wallets, amounts, overrides)
    const blockNumber = (await tx.wait()).blockNumber

    for (let i = 0; i < wallets.length; i++) {
      expect(await timeRelease.getOption2Allocation(wallets[i])).to.eq(amounts[i])
      expect(await timeRelease.getPriorVotes(wallets[i], blockNumber)).to.eq(amounts[i])
    }

    expect(await timeRelease.option2TotalAllocations()).to.eq(totalAllocation)
  })

  it('allocation exists', async () => {
    const { timeRelease, token, wallet } = await loadFixture(timeReleaseFixture)
    await token.mint(timeRelease.address, expandTo18Decimals(1))
    await timeRelease.initOption2Allocations([wallet.address], [expandTo18Decimals(1)])
    await expect(timeRelease.initOption2Allocations([wallet.address], [expandTo18Decimals(2)])).to.be.revertedWith(
      'TR_ALLOCATION_ALREADY_SET'
    )
  })

  it('allocation zero', async () => {
    const { timeRelease, wallet } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.initOption2Allocations([wallet.address], [BigNumber.from(0)])).to.be.revertedWith(
      'TR_ALLOCATION_ZERO'
    )
  })

  it('after claim', async () => {
    const { timeRelease, token, other, another, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 100], [5, 15])
    await setAllocations(other, 0, 10)

    await token.burnOnAddress(timeRelease.address)
    await token.mint(timeRelease.address, expandTo18Decimals(10))
    await timeRelease.connect(other).claim(other.address)
    await expect(
      timeRelease.initOption2Allocations([another.address], [expandTo18Decimals(1)], overrides)
    ).to.be.revertedWith('TR_INSUFFICIENT_BALANCE')
    await token.mint(timeRelease.address, expandTo18Decimals(1))
    await timeRelease.initOption2Allocations([another.address], [expandTo18Decimals(1)], overrides)
    expect(await timeRelease.getOption2Allocation(another.address)).to.eq(expandTo18Decimals(1))
  })

  // skip is intentional
  it.skip('plenty of inputs', async () => {
    const { timeRelease, token } = await loadFixture(timeReleaseFixture)
    const wallets = [...new Array(2000)].map(() => Wallet.createRandom().address)
    const amounts = [...new Array(2000)].map(() => utils.parseUnits(Math.floor(Math.random() * 10 + 1).toString()))
    const totalAllocation = amounts.reduce((acc: BigNumber, curr: BigNumber) => acc.add(curr), BigNumber.from(0))
    await token.mint(timeRelease.address, totalAllocation)

    const maxSliceLength = 367
    for (let i = 0; i < 6; i++) {
      await timeRelease.initOption2Allocations(
        wallets.slice(i * maxSliceLength, i * maxSliceLength + maxSliceLength),
        amounts.slice(i * maxSliceLength, i * maxSliceLength + maxSliceLength),
        overrides
      )
    }

    expect(await timeRelease.getOption2Allocation(wallets[0])).to.eq(amounts[0])
    expect(await timeRelease.getOption2Allocation(wallets[10])).to.eq(amounts[10])
    expect(await timeRelease.getOption2Allocation(wallets[500])).to.eq(amounts[500])
    expect(await timeRelease.getOption2Allocation(wallets[1000])).to.eq(amounts[1000])
    expect(await timeRelease.getOption2Allocation(wallets[1500])).to.eq(amounts[1500])
    expect(await timeRelease.getOption2Allocation(wallets[1999])).to.eq(amounts[1999])
    expect(await timeRelease.option2TotalAllocations()).to.eq(totalAllocation)
  }).timeout(60_000)
})
