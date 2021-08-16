import { expect } from 'chai'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralToken.setMinter', () => {
  const loadFixture = setupFixtureLoader()

  it('owner is minter by default', async () => {
    const { token } = await loadFixture(tokenFixture)
    expect(await token.isMinter(await token.owner())).to.be.true
  })

  it('sender must be owner', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.connect(other).setMinter(other.address, true)).to.be.revertedWith('IT_FORBIDDEN')
  })

  it('can set minter', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    expect(await token.isMinter(other.address)).to.be.false
    await token.setMinter(other.address, true)
    expect(await token.isMinter(other.address)).to.be.true
    await token.setMinter(other.address, false)
    expect(await token.isMinter(other.address)).to.be.false
  })

  it('emits event', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.setMinter(other.address, true)).to.emit(token, 'MinterSet').withArgs(other.address, true)
  })
})
