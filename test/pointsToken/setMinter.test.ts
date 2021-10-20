import { expect } from 'chai'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralPointsToken.setMinter', () => {
  const loadFixture = setupFixtureLoader()

  it('owner is minter by default', async () => {
    const { token } = await loadFixture(pointsTokenFixture)
    expect(await token.isMinter(await token.owner())).to.be.true
  })

  it('sender must be owner', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await expect(token.connect(other).setMinter(other.address, true)).to.be.revertedWith('IP_FORBIDDEN')
  })

  it('can set minter', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    expect(await token.isMinter(other.address)).to.be.false
    await token.setMinter(other.address, true, overrides)
    expect(await token.isMinter(other.address)).to.be.true
    await token.setMinter(other.address, false, overrides)
    expect(await token.isMinter(other.address)).to.be.false
  })

  it('emits event', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await expect(token.setMinter(other.address, true)).to.emit(token, 'MinterSet').withArgs(other.address, true)
  })
})
