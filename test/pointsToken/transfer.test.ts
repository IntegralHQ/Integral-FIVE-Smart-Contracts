import { expect } from 'chai'
import { constants } from 'ethers'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides, expandTo18Decimals } from '../shared/utilities'

describe('IntegralPointsToken.transfer', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts on insufficient balance', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await expect(token.transfer(other.address, expandTo18Decimals(1000000), overrides)).to.be.revertedWith(
      'SM_SUB_UNDERFLOW'
    )
  })

  it('reverts on invalid address', async () => {
    const { token } = await loadFixture(pointsTokenFixture)
    await expect(token.transfer(constants.AddressZero, expandTo18Decimals(1))).to.be.revertedWith('IP_INVALID_TO')
  })

  it('changes to balance', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    await token.transfer(other.address, amount)
    expect(await token.balanceOf(other.address)).to.eq(amount)
  })

  it('emits event', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    await expect(token.transfer(other.address, amount))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, amount)
  })
})
