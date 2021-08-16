import { expect } from 'chai'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlock, mineBlocks } from '../shared/utilities'

describe('IntegralTimeRelease.getReleasedOption2', () => {
  const loadFixture = setupFixtureLoader()

  it('no allocation', async () => {
    const { timeRelease, wallet } = await loadFixture(timeReleaseFixture)
    expect(await timeRelease.getReleasedOption2(wallet.address)).to.eq(0)
  })

  it('time not started yet', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 100], [20, 100])
    await setAllocations(wallet, 0, 10)
    expect(await timeRelease.getReleasedOption2(wallet.address)).to.eq(0)
  })

  it('time passed', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 100], [2, 5])
    await setAllocations(wallet, 0, 10)

    await mineBlock(wallet)
    expect(await timeRelease.getReleasedOption2(wallet.address)).to.eq(expandTo18Decimals(10))
  })

  it('in the middle', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([0, 100], [7, 17])
    await setAllocations(wallet, 0, 10)

    expect(await timeRelease.getReleasedOption2(wallet.address)).to.eq(expandTo18Decimals(0))
    await mineBlocks(wallet, 3)
    expect(await timeRelease.getReleasedOption2(wallet.address)).to.eq(expandTo18Decimals(2))
    await mineBlocks(wallet, 2)
    expect(await timeRelease.getReleasedOption2(wallet.address)).to.eq(expandTo18Decimals(4))
    await mineBlocks(wallet, 5)
    expect(await timeRelease.getReleasedOption2(wallet.address)).to.eq(expandTo18Decimals(9))
  })
})
