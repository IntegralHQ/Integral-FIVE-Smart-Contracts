import { expect } from 'chai'
import { timeReleaseFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralTimeRelease.setOwner', () => {
  const loadFixture = setupFixtureLoader()

  it('only owner can call', async () => {
    const { other, wallet, timeRelease } = await loadFixture(timeReleaseFixture)

    await expect(timeRelease.setOwner(other.address)).to.emit(timeRelease, 'OwnerSet').withArgs(other.address)
    expect(await timeRelease.owner()).to.eq(other.address)

    await expect(timeRelease.connect(other).setOwner(wallet.address))
      .to.emit(timeRelease, 'OwnerSet')
      .withArgs(wallet.address)
    expect(await timeRelease.owner()).to.eq(wallet.address)
  })

  it('no owner', async () => {
    const { timeRelease, wallet, other } = await loadFixture(timeReleaseFixture)
    await expect(timeRelease.connect(other).setOwner(other.address)).to.be.revertedWith('TR_FORBIDDEN')
    expect(await timeRelease.owner()).to.eq(wallet.address)
  })
})
