import { parseUnits } from '@ethersproject/units'
import { expect } from 'chai'
import { constants, utils } from 'ethers'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { mineBlock, mineBlocks, overrides } from '../shared/utilities'

type TestCase = [number, number, number, number, number, string]

describe('IntegralTimeRelease.skim', () => {
  const loadFixture = setupFixtureLoader()

  it('only owner', async () => {
    const { timeRelease, other, wallet } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.connect(other).skim(wallet.address)).to.be.revertedWith('TR_FORBIDDEN')
  })

  it('zero address', async () => {
    const { timeRelease } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.skim(constants.AddressZero)).to.be.revertedWith('TR_ADDRESS_ZERO')
  })

  it('stop block equals end block', async () => {
    const { timeRelease, other, token, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 3], [0, 4])
    await setAllocations(other, 10, 10)

    const balanceBefore = await token.balanceOf(other.address)
    await timeRelease.skim(other.address)
    const balanceAfter = await token.balanceOf(other.address)
    expect(balanceBefore).to.eq(balanceAfter)
  })

  it('transfers token', async () => {
    const { timeRelease, wallet, token, setupTimeRelease, other } = await loadFixture(timeReleaseFixture)
    const setup = await setupTimeRelease([0, 100], [8, 18])
    await setup(other, 100, 20)
    await timeRelease.connect(other).claim(other.address)
    await timeRelease.updateOption1Allocations([other.address], [utils.parseUnits('50')], overrides)
    const balanceBefore = await token.balanceOf(wallet.address)
    await expect(timeRelease.skim(wallet.address, overrides))
      .to.emit(timeRelease, 'Skim')
      .withArgs(wallet.address, utils.parseUnits('50'))
    const balanceAfter = await token.balanceOf(wallet.address)
    expect(balanceAfter.sub(balanceBefore)).to.eq(utils.parseUnits('50'))
  })

  it('after stop block set', async () => {
    const { timeRelease, wallet, token, setupTimeRelease, other } = await loadFixture(timeReleaseFixture)
    const setup = await setupTimeRelease([0, 100], [8, 18])
    await setup(other, 100, 20)
    await timeRelease.connect(other).claim(other.address)
    await timeRelease.updateOption1Allocations([other.address], [utils.parseUnits('50')], overrides)
    await timeRelease.setOption1StopBlock(10, overrides)
    await mineBlock(wallet)
    const balanceBefore = await token.balanceOf(wallet.address)
    await expect(timeRelease.skim(wallet.address, overrides))
      .to.emit(timeRelease, 'Skim')
      .withArgs(wallet.address, utils.parseUnits('95'))
    const balanceAfter = await token.balanceOf(wallet.address)
    expect(balanceAfter.sub(balanceBefore)).to.eq(utils.parseUnits('95'))
  })

  const testCases: TestCase[] = [
    [31, 3, 25, 13, 11, '16.909090909090909091'],
    [31, 9, 25, 9, 6, '31.000000000000000000'],
    [31, 8, 25, 24, 20, '1.823529411764705883'],
    [107, 2, 81, 13, 11, '92.101265822784810127'],
    [107, 2, 81, 80, 80, '1.354430379746835444'],
  ]

  for (const testCase of testCases) {
    const [allocation, startBlock, endBlock, stopBlock, blocksToMine, expectedRaw] = testCase

    it(`option1:    allocation: ${allocation}, start: ${startBlock}, end: ${endBlock}, stop: ${stopBlock}`, async () => {
      const { timeRelease, other, token, setupTimeRelease } = await loadFixture(timeReleaseFixture)
      const setAllocations = await setupTimeRelease([startBlock, endBlock], [0, 100])
      await setAllocations(other, allocation, 0)

      await timeRelease.setOption1StopBlock(stopBlock)
      await mineBlocks(other, blocksToMine)

      const balanceBefore = await token.balanceOf(other.address)
      const tx = await timeRelease.skim(other.address)
      const balanceAfter = await token.balanceOf(other.address)

      const expected = parseUnits(expectedRaw)
      await expect(Promise.resolve(tx)).to.emit(timeRelease, 'Skim').withArgs(other.address, expected)
      expect(balanceAfter.sub(balanceBefore)).to.eq(expected)
    })

    it(`option2:    allocation: ${allocation}, start: ${startBlock}, end: ${endBlock}, stop: ${stopBlock}`, async () => {
      const { timeRelease, other, token, setupTimeRelease } = await loadFixture(timeReleaseFixture)
      const setAllocations = await setupTimeRelease([0, 100], [startBlock, endBlock])
      await setAllocations(other, 0, allocation)

      await timeRelease.setOption2StopBlock(stopBlock)
      await mineBlocks(other, blocksToMine)

      const balanceBefore = await token.balanceOf(other.address)
      const tx = await timeRelease.skim(other.address)
      const balanceAfter = await token.balanceOf(other.address)

      const expected = parseUnits(expectedRaw)
      await expect(Promise.resolve(tx)).to.emit(timeRelease, 'Skim').withArgs(other.address, expected)
      expect(balanceAfter.sub(balanceBefore)).to.eq(expected)
    })
  }
})
