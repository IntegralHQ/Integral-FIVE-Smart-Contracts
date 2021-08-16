import { expect } from 'chai'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralPointsToken.setBurner', () => {
  const loadFixture = setupFixtureLoader()

  it('owner is burner by default', async () => {
    const { token } = await loadFixture(pointsTokenFixture)
    expect(await token.isBurner(await token.owner())).to.be.true
  })

  it('sender must be owner', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await expect(token.connect(other).setBurner(other.address, true)).to.be.revertedWith('IP_FORBIDDEN')
  })

  it('can set burner', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    expect(await token.isBurner(other.address)).to.be.false
    await token.setBurner(other.address, true)
    expect(await token.isBurner(other.address)).to.be.true
    await token.setBurner(other.address, false)
    expect(await token.isBurner(other.address)).to.be.false
  })

  it('emits event', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await expect(token.setBurner(other.address, true)).to.emit(token, 'BurnerSet').withArgs(other.address, true)
  })
})
