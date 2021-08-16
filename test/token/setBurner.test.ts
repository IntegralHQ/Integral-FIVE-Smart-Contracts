import { expect } from 'chai'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralToken.setBurner', () => {
  const loadFixture = setupFixtureLoader()

  it('owner is burner by default', async () => {
    const { token } = await loadFixture(tokenFixture)
    expect(await token.isBurner(await token.owner())).to.be.true
  })

  it('sender must be owner', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.connect(other).setBurner(other.address, true)).to.be.revertedWith('IT_FORBIDDEN')
  })

  it('can set burner', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    expect(await token.isBurner(other.address)).to.be.false
    await token.setBurner(other.address, true)
    expect(await token.isBurner(other.address)).to.be.true
    await token.setBurner(other.address, false)
    expect(await token.isBurner(other.address)).to.be.false
  })

  it('emits event', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.setBurner(other.address, true)).to.emit(token, 'BurnerSet').withArgs(other.address, true)
  })
})
