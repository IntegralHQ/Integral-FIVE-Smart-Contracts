import { expect } from 'chai'
import { constants } from 'ethers'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, MAX_UINT_96, overrides } from '../shared/utilities'

describe('IntegralToken.transferFrom', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts on amount higher than 2**96', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const amount = MAX_UINT_96.add(1)
    await expect(token.transferFrom(wallet.address, other.address, amount)).to.be.revertedWith('IT_EXCEEDS_96_BITS')
  })

  it('reverts on insufficient allowance', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const amount = expandTo18Decimals(1)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, amount)).to.be.revertedWith(
      'SM_SUB_UNDERFLOW'
    )
  })

  it('does not decrease allowance when set for infinity', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const amount = expandTo18Decimals(1)
    await token.approve(other.address, constants.MaxUint256)
    await token.connect(other).transferFrom(wallet.address, other.address, amount, overrides)
    expect(await token.allowance(wallet.address, other.address)).to.eq(MAX_UINT_96)
  })

  it('does not decrease allowance when sender is from', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const amount = expandTo18Decimals(1)
    await token.approve(wallet.address, amount)
    await token.transferFrom(wallet.address, other.address, amount, overrides)
    expect(await token.allowance(wallet.address, wallet.address)).to.eq(amount)
  })

  it('transfers tokens', async () => {
    const { token, wallet, other } = await loadFixture(tokenFixture)
    const amount = expandTo18Decimals(1)
    const allowance = expandTo18Decimals(2)
    const ownerBalanceBefore = await token.balanceOf(wallet.address)
    const spenderBalanceBefore = await token.balanceOf(other.address)
    await token.approve(other.address, allowance)
    await token.connect(other).transferFrom(wallet.address, other.address, amount, overrides)
    expect(await token.balanceOf(other.address)).to.eq(spenderBalanceBefore.add(amount))
    expect(await token.balanceOf(wallet.address)).to.eq(ownerBalanceBefore.sub(amount))
    expect(await token.allowance(wallet.address, other.address)).to.eq(allowance.sub(amount))
  })

  it('updates votes', async () => {
    const { token, wallet, other, another } = await loadFixture(tokenFixture)
    await token.approve(other.address, constants.MaxUint256)
    const initialVotes = await token.getCurrentVotes(wallet.address)
    const amount = expandTo18Decimals(10)

    await expect(token.connect(other).transferFrom(wallet.address, another.address, amount))
      .to.emit(token, 'DelegateVotesChanged')
      .withArgs(wallet.address, initialVotes, initialVotes.sub(amount))
      .to.emit(token, 'DelegateVotesChanged')
      .withArgs(another.address, 0, amount)

    expect(await token.getCurrentVotes(another.address)).to.eq(amount)
    expect(await token.getCurrentVotes(other.address)).to.eq(0)
    expect(await token.getCurrentVotes(wallet.address)).to.eq(initialVotes.sub(amount))
  })

  it('transfers delegated votes', async () => {
    const { token, wallet, other, another } = await loadFixture(tokenFixture)
    await token.approve(other.address, constants.MaxUint256)

    expect(await token.getCurrentVotes(other.address)).to.eq(0)

    const initialVotes = await token.getCurrentVotes(wallet.address)
    await token.delegate(other.address)

    expect(await token.getCurrentVotes(wallet.address)).to.eq(0)
    expect(await token.getCurrentVotes(other.address)).to.eq(initialVotes)
    expect(await token.getCurrentVotes(another.address)).to.eq(0)

    const amount = expandTo18Decimals(10)
    await token.transferFrom(wallet.address, another.address, amount, overrides)

    expect(await token.getCurrentVotes(wallet.address)).to.eq(0)
    expect(await token.getCurrentVotes(other.address)).to.eq(initialVotes.sub(amount))
    expect(await token.getCurrentVotes(another.address)).to.eq(amount)
  })

  it('transfers delegated votes to a delegate of receiver', async () => {
    const { token, wallet, other, another } = await loadFixture(tokenFixture)
    await token.approve(other.address, constants.MaxUint256)

    expect(await token.getCurrentVotes(other.address)).to.eq(0)

    const initialVotes = await token.getCurrentVotes(wallet.address)
    await token.delegate(another.address)
    await token.connect(other).delegate(wallet.address)

    expect(await token.getCurrentVotes(wallet.address)).to.eq(0)
    expect(await token.getCurrentVotes(other.address)).to.eq(0)
    expect(await token.getCurrentVotes(another.address)).to.eq(initialVotes)

    const amount = expandTo18Decimals(10)
    await token.transferFrom(wallet.address, other.address, amount, overrides)

    expect(await token.getCurrentVotes(wallet.address)).to.eq(amount)
    expect(await token.getCurrentVotes(other.address)).to.eq(0)
    expect(await token.getCurrentVotes(another.address)).to.eq(initialVotes.sub(amount))
  })
})
