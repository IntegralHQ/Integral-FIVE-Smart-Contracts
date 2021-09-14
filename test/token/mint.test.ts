import { expect } from 'chai'
import { constants } from 'ethers'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, MAX_UINT_96, overrides } from '../shared/utilities'

describe('IntegralToken.mint', () => {
  const loadFixture = setupFixtureLoader()

  it('only whitelisted can mint', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.connect(other).mint(other.address, 1)).to.be.revertedWith('IT_ONLY_WHITELISTED')
  })

  it('can add minter', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setMinter(other.address, true)
    expect(await token.isMinter(other.address)).to.eq(true)
  })

  it('can remove minter', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await token.setMinter(other.address, true)
    await token.setMinter(other.address, false)
    expect(await token.isMinter(other.address)).to.eq(false)
  })

  it('reverts on amount higher than 2**96', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    await expect(token.mint(wallet.address, MAX_UINT_96.add(1))).to.be.revertedWith('IT_EXCEEDS_96_BITS')
  })

  it('increases totalSupply', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    const totalSupply = await token.totalSupply()
    const mintedAmount = expandTo18Decimals(1)
    await token.mint(wallet.address, mintedAmount)
    expect(await token.totalSupply()).to.eq(totalSupply.add(mintedAmount))
  })

  it('increases balance of issuer', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    const balance = await token.balanceOf(wallet.address)
    const mintedAmount = expandTo18Decimals(1)
    await token.mint(wallet.address, mintedAmount)
    expect(await token.balanceOf(wallet.address)).to.eq(balance.add(mintedAmount))
  })

  it('reverts on too big amount', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    await expect(token.mint(wallet.address, MAX_UINT_96)).to.be.revertedWith('SM_ADD_OVERFLOW')
  })

  it('emits event', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    const amount = expandTo18Decimals(1)
    await expect(token.mint(wallet.address, amount))
      .to.emit(token, 'Transfer')
      .withArgs(constants.AddressZero, wallet.address, amount)
  })

  it('updates votes', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    const initialVotes = await token.getCurrentVotes(wallet.address)
    await token.mint(wallet.address, expandTo18Decimals(1))
    expect(await token.getCurrentVotes(wallet.address)).to.eq(initialVotes.add(expandTo18Decimals(1)))
  })

  it('can delegate votes after mint', async () => {
    const { token, wallet, other, another } = await loadFixture(tokenFixture)
    await token.delegate(other.address)
    const delegatedVotes = await token.getCurrentVotes(other.address)

    const mintedAmount = expandTo18Decimals(5)
    await token.mint(wallet.address, mintedAmount)
    await token.delegate(another.address, overrides)

    expect(await token.getCurrentVotes(another.address)).to.equal(delegatedVotes.add(mintedAmount))
  })
})
