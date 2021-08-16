import { expect } from 'chai'
import { constants } from 'ethers'
import { pointsTokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals } from '../shared/utilities'

describe('IntegralPointsToken.mint', () => {
  const loadFixture = setupFixtureLoader()

  it('only whitelisted can mint', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await expect(token.connect(other).mint(other.address, 1)).to.be.revertedWith('IP_ONLY_WHITELISTED')
  })

  it('can add minter', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setMinter(other.address, true)
    expect(await token.isMinter(other.address)).to.eq(true)
  })

  it('can remove minter', async () => {
    const { token, other } = await loadFixture(pointsTokenFixture)
    await token.setMinter(other.address, true)
    expect(await token.isMinter(other.address)).to.eq(true)
    await token.setMinter(other.address, false)
    expect(await token.isMinter(other.address)).to.eq(false)
  })

  it('increases totalSupply', async () => {
    const { token, wallet } = await loadFixture(pointsTokenFixture)
    const totalSupply = await token.totalSupply()
    const mintedAmount = expandTo18Decimals(1)
    await token.mint(wallet.address, mintedAmount)
    expect(await token.totalSupply()).to.eq(totalSupply.add(mintedAmount))
  })

  it('increases balance of issuer', async () => {
    const { token, wallet } = await loadFixture(pointsTokenFixture)
    const balance = await token.balanceOf(wallet.address)
    const mintedAmount = expandTo18Decimals(1)
    await token.mint(wallet.address, mintedAmount)
    expect(await token.balanceOf(wallet.address)).to.eq(balance.add(mintedAmount))
  })

  it('reverts on too big amount', async () => {
    const { token, wallet } = await loadFixture(pointsTokenFixture)
    await expect(token.mint(wallet.address, constants.MaxUint256)).to.be.revertedWith('SM_ADD_OVERFLOW')
  })

  it('emits event', async () => {
    const { token, wallet } = await loadFixture(pointsTokenFixture)
    const amount = expandTo18Decimals(1)
    await expect(token.mint(wallet.address, amount))
      .to.emit(token, 'Transfer')
      .withArgs(constants.AddressZero, wallet.address, amount)
  })
})
