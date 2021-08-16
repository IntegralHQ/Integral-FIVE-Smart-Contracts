import { expect } from 'chai'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, MAX_UINT_96 } from '../shared/utilities'

describe('IntegralToken.decreaseAllowance', () => {
  const loadFixture = setupFixtureLoader()

  it('amount higher than 2**96', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.decreaseAllowance(other.address, MAX_UINT_96.add(1))).to.be.revertedWith('IT_EXCEEDS_96_BITS')
  })

  it('subtracted amount lower than 0', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.approve(other.address, expandTo18Decimals(10))
    await expect(token.decreaseAllowance(other.address, expandTo18Decimals(11))).to.be.revertedWith(
      'IT_CANNOT_DECREASE'
    )
  })

  it('changes allowance', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    await token.approve(other.address, expandTo18Decimals(10))
    const tx = await token.decreaseAllowance(other.address, expandTo18Decimals(1))

    const expectedAllowance = expandTo18Decimals(9)
    await expect(Promise.resolve(tx))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, expectedAllowance)
    expect(await token.allowance(wallet.address, other.address)).to.eq(expectedAllowance)
  })
})
