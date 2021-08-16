import { expect } from 'chai'
import { tokenFixture } from '../shared/fixtures/tokenFixture'
import { setupFixtureLoader } from '../shared/setup'

describe('IntegralToken.setOwner', () => {
  const loadFixture = setupFixtureLoader()

  it('only owner can call', async () => {
    const { token, other, wallet } = await loadFixture(tokenFixture)

    await expect(token.setOwner(other.address)).to.emit(token, 'OwnerSet').withArgs(other.address)
    expect(await token.owner()).to.eq(other.address)

    await expect(token.connect(other).setOwner(wallet.address)).to.emit(token, 'OwnerSet').withArgs(wallet.address)
    expect(await token.owner()).to.eq(wallet.address)
  })

  it('no owner', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    await expect(token.connect(other).setOwner(other.address)).to.be.revertedWith('IT_FORBIDDEN')
    expect(await token.owner()).to.eq(wallet.address)
  })
})
