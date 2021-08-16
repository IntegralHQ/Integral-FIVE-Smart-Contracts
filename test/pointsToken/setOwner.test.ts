import { expect } from 'chai'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPointsToken.setOwner', () => {
  const loadFixture = setupFixtureLoader()

  it('only owner can call', async () => {
    const { token, other, wallet } = await loadFixture(pointsTokenFixture)

    await expect(token.setOwner(other.address)).to.emit(token, 'OwnerSet').withArgs(other.address)
    expect(await token.owner()).to.eq(other.address)

    await expect(token.connect(other).setOwner(wallet.address)).to.emit(token, 'OwnerSet').withArgs(wallet.address)
    expect(await token.owner()).to.eq(wallet.address)
  })

  it('no owner cannot call', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    await expect(token.connect(other).setOwner(other.address)).to.be.revertedWith('IP_FORBIDDEN')
    expect(await token.owner()).to.eq(wallet.address)
  })
})
