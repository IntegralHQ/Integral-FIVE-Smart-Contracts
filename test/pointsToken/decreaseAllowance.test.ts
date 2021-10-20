import { expect } from 'chai'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralPointsToken.decreaseAllowance', () => {
  const loadFixture = setupFixtureLoader()

  it('subtracted amount lower than 0', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.approve(other.address, expandTo18Decimals(10), overrides)
    await expect(token.decreaseAllowance(other.address, expandTo18Decimals(11))).to.be.revertedWith(
      'IP_CANNOT_DECREASE'
    )
  })

  it('changes allowance', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    await token.approve(other.address, expandTo18Decimals(10))
    const tx = await token.decreaseAllowance(other.address, expandTo18Decimals(1), overrides)

    const expectedAllowance = expandTo18Decimals(9)
    await expect(Promise.resolve(tx))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, expectedAllowance)
    expect(await token.allowance(wallet.address, other.address)).to.eq(expectedAllowance)
  })
})
