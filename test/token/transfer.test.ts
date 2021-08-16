import { expect } from 'chai'
import { constants } from 'ethers'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { overrides, expandTo18Decimals, MAX_UINT_96 } from '../shared/utilities'

describe('IntegralToken.transfer', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts on amount higher than 2**96', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.transfer(other.address, MAX_UINT_96.add(1), overrides)).to.be.revertedWith('IT_EXCEEDS_96_BITS')
  })

  it('reverts on insufficient balance', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    await expect(token.transfer(other.address, expandTo18Decimals(1000000), overrides)).to.be.revertedWith(
      'SM_SUB_UNDERFLOW'
    )
  })

  it('reverts on invalid address', async () => {
    const { token } = await loadFixture(tokenFixture)
    await expect(token.transfer(constants.AddressZero, expandTo18Decimals(1))).to.be.revertedWith('IT_INVALID_TO')
  })

  it('changes to balance', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    const amount = expandTo18Decimals(1)
    await token.transfer(other.address, amount)
    expect(await token.balanceOf(other.address)).to.eq(amount)
  })

  it('emits event', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const amount = expandTo18Decimals(1)
    await expect(token.transfer(other.address, amount))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, amount)
  })

  it('updates votes', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const initialVotes = await token.getCurrentVotes(wallet.address)
    const amount = expandTo18Decimals(10)

    await expect(token.transfer(other.address, amount))
      .to.emit(token, 'DelegateVotesChanged')
      .withArgs(wallet.address, initialVotes, initialVotes.sub(amount))
      .to.emit(token, 'DelegateVotesChanged')
      .withArgs(other.address, 0, amount)

    expect(await token.getCurrentVotes(wallet.address)).to.eq(initialVotes.sub(amount))
    expect(await token.getCurrentVotes(other.address)).to.eq(amount)
  })
})
