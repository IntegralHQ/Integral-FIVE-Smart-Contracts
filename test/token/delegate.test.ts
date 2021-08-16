import { expect } from 'chai'
import { constants } from 'ethers'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides } from '../shared/utilities'

describe('IntegralToken.delegate', () => {
  const loadFixture = setupFixtureLoader()

  it('delegates to address zero', async () => {
    const { token } = await loadFixture(tokenFixture)

    await expect(token.delegate(constants.AddressZero)).to.be.revertedWith('IT_INVALID_DELEGATE')
  })

  it('delegates to other', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const tx = await token.delegate(other.address, overrides)

    await expect(Promise.resolve(tx))
      .to.emit(token, 'DelegatesChanged')
      .withArgs(wallet.address, wallet.address, other.address)

    expect(await token.delegates(wallet.address)).to.eq(other.address)
  })

  it('delegates to other and then to another', async () => {
    const { token, wallet, other, another } = await loadFixture(tokenFixture)
    await token.delegate(other.address, overrides)

    await expect(token.delegate(another.address, overrides))
      .to.emit(token, 'DelegatesChanged')
      .withArgs(wallet.address, other.address, another.address)

    expect(await token.delegates(wallet.address)).to.eq(another.address)
  })
})
