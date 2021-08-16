import { BigNumber } from '@ethersproject/bignumber'
import { expect } from 'chai'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralTimeRelease.getClaimableOption1', () => {
  const loadFixture = setupFixtureLoader()

  it('gets tokens to claim', async () => {
    const { timeRelease, other, setupTimeRelease } = await loadFixture(timeReleaseFixture)

    expect(await timeRelease.getClaimableOption1(other.address)).to.eq(BigNumber.from(0))

    const setAllocations = await setupTimeRelease([8, 18], [0, 100])
    await setAllocations(other, 10, 0)
    expect(await timeRelease.getClaimableOption1(other.address)).to.eq(BigNumber.from(0))

    await mineBlocks(other, 3)
    expect(await timeRelease.getClaimableOption1(other.address)).to.eq(expandTo18Decimals(1))

    await mineBlocks(other, 2)
    expect(await timeRelease.getClaimableOption1(other.address)).to.eq(expandTo18Decimals(3))

    await timeRelease.connect(other).claim(other.address)
    expect(await timeRelease.getClaimableOption1(other.address)).to.eq(BigNumber.from(0))
  })
})
