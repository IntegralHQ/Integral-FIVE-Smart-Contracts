import { setupFixtureLoader } from '../shared/setup'
import { pointsTokenFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, overrides } from '../shared/utilities'
import { constants } from 'ethers'

describe('IntegralPointsToken.approve', () => {
  const loadFixture = setupFixtureLoader()

  it('default allowance is zero', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    expect(await token.allowance(wallet.address, other.address)).to.eq(0)
  })

  it('can approve max', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    await token.approve(other.address, constants.MaxUint256, overrides)
    expect(await token.allowance(wallet.address, other.address)).to.eq(constants.MaxUint256)
  })

  it('reverts on address zero spender', async () => {
    const { token } = await loadFixture(pointsTokenFixture)
    await expect(token.approve(constants.AddressZero, expandTo18Decimals(1))).to.be.revertedWith('IP_ADDRESS_ZERO')
  })

  it('can change allowance', async () => {
    const { token, wallet, other } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    const tx = await token.approve(other.address, amount, overrides)

    await expect(Promise.resolve(tx)).to.emit(token, 'Approval').withArgs(wallet.address, other.address, amount)
    expect(await token.allowance(wallet.address, other.address)).to.eq(amount)
  })
})
