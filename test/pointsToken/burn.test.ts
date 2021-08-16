import { expect } from 'chai'
import { constants } from 'ethers'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides } from '../shared/utilities'

describe('IntegralPointsToken.burn', () => {
  const loadFixture = setupFixtureLoader()

  it('only whitelisted can burn', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await expect(token.connect(other).burn(1)).to.be.revertedWith('IP_ONLY_WHITELISTED')
  })

  it('can add burner', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBurner(other.address, true)
    expect(await token.isBurner(other.address)).to.eq(true)
  })

  it('can remove burner', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setBurner(other.address, true)
    expect(await token.isBurner(other.address)).to.eq(true)
    await token.setBurner(other.address, false)
    expect(await token.isBurner(other.address)).to.eq(false)
  })

  it('decreases totalSupply', async () => {
    const { token } = await loadFixture(pointsTokenFixture)
    const totalSupply = await token.totalSupply()
    const burntAmount = expandTo18Decimals(1)
    await token.burn(burntAmount)
    expect(await token.totalSupply()).to.eq(totalSupply.sub(burntAmount))
  })

  it('reverts when burntAmount exceeds totalSupply', async () => {
    const { token } = await loadFixture(pointsTokenFixture)
    // token contract was initialized with 10000 total supply.
    await expect(token.burn(expandTo18Decimals(1000000000))).to.be.revertedWith('IP_INVALID_BURN_AMOUNT')
  })

  it('decreases balance of issuer', async () => {
    const { token, wallet } = await loadFixture(pointsTokenFixture)
    const balance = await token.balanceOf(wallet.address)
    const burntAmount = expandTo18Decimals(1)
    await token.burn(burntAmount)
    expect(await token.balanceOf(wallet.address)).to.eq(balance.sub(burntAmount))
  })

  it('emits event', async () => {
    const { token, wallet } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    await expect(token.burn(amount)).to.emit(token, 'Transfer').withArgs(wallet.address, constants.AddressZero, amount)
  })

  it('whitelisted address zero allows everyone to burn', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    await token.mint(other.address, amount)
    await token.setBurner(constants.AddressZero, true)
    await expect(token.connect(other).burn(amount, overrides))
      .to.emit(token, 'Transfer')
      .withArgs(other.address, constants.AddressZero, amount)
  })

  it('insufficient balance', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.mint(other.address, expandTo18Decimals(10))
    const balance = await token.balanceOf(other.address)
    await token.setBurner(other.address, true)
    await expect(token.connect(other).burn(balance.add(1))).to.be.revertedWith('SM_SUB_UNDERFLOW')
  })
})
