import { setupFixtureLoader } from '../shared/setup'
import { tokenFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, MAX_UINT_96 } from '../shared/utilities'
import { constants } from 'ethers'

describe('IntegralToken.approve', () => {
  const loadFixture = setupFixtureLoader()

  it('default allowance is zero', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    expect(await token.allowance(wallet.address, other.address)).to.eq(0)
  })

  it('reverts on amount higher than 2**96', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.approve(other.address, MAX_UINT_96.add(1))).to.be.revertedWith('IT_EXCEEDS_96_BITS')
  })

  it('reverts on address zero spender', async () => {
    const { token } = await loadFixture(tokenFixture)
    await expect(token.approve(constants.AddressZero, expandTo18Decimals(1))).to.be.revertedWith('IT_ADDRESS_ZERO')
  })

  it('adjusts max allowance to 96 bits', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    await token.approve(other.address, constants.MaxUint256)
    expect(await token.allowance(wallet.address, other.address)).to.eq(MAX_UINT_96)
  })

  it('can change allowance', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const amount = expandTo18Decimals(1)
    const tx = await token.approve(other.address, amount)

    await expect(Promise.resolve(tx)).to.emit(token, 'Approval').withArgs(wallet.address, other.address, amount)
    expect(await token.allowance(wallet.address, other.address)).to.eq(amount)
  })
})
