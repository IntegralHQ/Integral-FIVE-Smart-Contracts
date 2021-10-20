import { setupFixtureLoader } from '../shared/setup'
import { pointsTokenFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { constants } from 'ethers'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralPointsToken.increaseAllowance', () => {
  const loadFixture = setupFixtureLoader()

  it('summed amount higher than 2**256', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.approve(other.address, expandTo18Decimals(10), overrides)
    await expect(token.increaseAllowance(other.address, constants.MaxUint256)).to.be.revertedWith('SM_ADD_OVERFLOW')
  })

  it('changes allowance', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    await token.approve(other.address, expandTo18Decimals(10))
    const tx = await token.increaseAllowance(other.address, expandTo18Decimals(1), overrides)

    const expectedAllowance = expandTo18Decimals(11)
    await expect(Promise.resolve(tx))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, expectedAllowance)
    expect(await token.allowance(wallet.address, other.address)).to.eq(expectedAllowance)
  })
})
