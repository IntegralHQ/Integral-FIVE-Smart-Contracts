import { expect } from 'chai'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlocks, mineBlock } from '../shared/utilities'

describe('IntegralTimeRelease.getReleasedOption1', () => {
  const loadFixture = setupFixtureLoader()

  it('no allocation', async () => {
    const { timeRelease, wallet } = await loadFixture(timeReleaseFixture)
    expect(await timeRelease.getReleasedOption1(wallet.address)).to.eq(0)
  })

  it('time not started yet', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([20, 100], [0, 100])
    await setAllocations(wallet, 10, 0)
    expect(await timeRelease.getReleasedOption1(wallet.address)).to.eq(0)
  })

  it('time passed', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([2, 3], [0, 100])
    await setAllocations(wallet, 10, 0)

    await mineBlock(wallet)
    expect(await timeRelease.getReleasedOption1(wallet.address)).to.eq(expandTo18Decimals(10))
  })

  it('in the middle', async () => {
    const { timeRelease, wallet, setupTimeRelease } = await loadFixture(timeReleaseFixture)
    const setAllocations = await setupTimeRelease([7, 17], [0, 100])
    await setAllocations(wallet, 10, 0)

    expect(await timeRelease.getReleasedOption1(wallet.address)).to.eq(expandTo18Decimals(0))
    await mineBlocks(wallet, 3)
    expect(await timeRelease.getReleasedOption1(wallet.address)).to.eq(expandTo18Decimals(2))
    await mineBlocks(wallet, 2)
    expect(await timeRelease.getReleasedOption1(wallet.address)).to.eq(expandTo18Decimals(4))
    await mineBlocks(wallet, 5)
    expect(await timeRelease.getReleasedOption1(wallet.address)).to.eq(expandTo18Decimals(9))
  })
})
