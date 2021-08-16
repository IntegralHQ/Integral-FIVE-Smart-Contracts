import { setupFixtureLoader } from '../shared/setup'
import { tokenFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, MAX_UINT_96 } from '../shared/utilities'

describe('IntegralToken.increaseAllowance', () => {
  const loadFixture = setupFixtureLoader()

  it('amount higher than 2**96', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.increaseAllowance(other.address, MAX_UINT_96.add(1))).to.be.revertedWith('IT_EXCEEDS_96_BITS')
  })

  it('summed amount higher than 2**96', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.approve(other.address, expandTo18Decimals(10))
    await expect(token.increaseAllowance(other.address, MAX_UINT_96)).to.be.revertedWith('SM_ADD_OVERFLOW')
  })

  it('changes allowance', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    await token.approve(other.address, expandTo18Decimals(10))
    const tx = await token.increaseAllowance(other.address, expandTo18Decimals(1))

    const expectedAllowance = expandTo18Decimals(11)
    await expect(Promise.resolve(tx))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, expectedAllowance)
    expect(await token.allowance(wallet.address, other.address)).to.eq(expectedAllowance)
  })
})
