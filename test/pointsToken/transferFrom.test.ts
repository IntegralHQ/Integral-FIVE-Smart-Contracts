import { expect } from 'chai'
import { constants } from 'ethers'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralPointsToken.transferFrom', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts on insufficient allowance', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, amount)).to.be.revertedWith(
      'SM_SUB_UNDERFLOW'
    )
  })

  it('does not decrease allowance when set for infinity', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    await token.approve(other.address, constants.MaxUint256, overrides)
    await token.connect(other).transferFrom(wallet.address, other.address, amount, overrides)
    expect(await token.allowance(wallet.address, other.address)).to.eq(constants.MaxUint256)
  })

  it('does not decrease allowance when sender address is the same as the `from` address', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    await token.approve(wallet.address, amount, overrides)
    await token.transferFrom(wallet.address, other.address, amount, overrides)
    expect(await token.allowance(wallet.address, wallet.address)).to.eq(amount)
  })

  it('transfers tokens', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    const allowance = expandTo18Decimals(2)
    const ownerBalanceBefore = await token.balanceOf(wallet.address)
    const spenderBalanceBefore = await token.balanceOf(other.address)
    await token.approve(other.address, allowance, overrides)
    await token.connect(other).transferFrom(wallet.address, other.address, amount, overrides)
    expect(await token.balanceOf(other.address)).to.eq(spenderBalanceBefore.add(amount))
    expect(await token.balanceOf(wallet.address)).to.eq(ownerBalanceBefore.sub(amount))
    expect(await token.allowance(wallet.address, other.address)).to.eq(allowance.sub(amount))
  })
})
