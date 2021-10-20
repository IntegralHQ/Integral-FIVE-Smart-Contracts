import { constants } from 'ethers'
import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralStaking.withdraw', () => {
  const loadFixture = setupFixtureLoader()

  it('invalid index', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000))

    await expect(staking.withdraw(1, wallet.address)).to.be.revertedWith('IS_INVALID_ID')
  })

  it('withdraw before unlocked', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000))

    await expect(staking.withdraw(0, wallet.address)).to.be.revertedWith('IS_LOCKED')
  })

  it('change balance', async () => {
    const { wallet, token, staking, stakingPeriod } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    await staking.deposit(amount)
    await staking.deposit(amount)

    await mineBlocks(wallet, stakingPeriod)

    expect(await staking.getTotalStaked(wallet.address)).to.be.equal(amount.mul(2))

    await expect(staking.withdraw(0, wallet.address))
      .to.emit(staking, 'Withdraw')
      .withArgs(wallet.address, 0, amount, wallet.address)

    expect(await token.balanceOf(staking.address)).to.be.equal(amount)

    let userStake = await staking.userStakes(wallet.address, 0)
    expect(userStake.withdrawn).not.be.equal(false)

    expect(await staking.getTotalStaked(wallet.address)).to.be.equal(amount)

    await expect(staking.withdraw(1, wallet.address))
      .to.emit(staking, 'Withdraw')
      .withArgs(wallet.address, 1, amount, wallet.address)

    expect(await token.balanceOf(staking.address)).to.be.equal(0)

    userStake = await staking.userStakes(wallet.address, 1)
    expect(userStake.withdrawn).not.be.equal(false)

    expect(await staking.getTotalStaked(wallet.address)).to.be.equal(0)
  })

  it('revert second withdraw', async () => {
    const { wallet, staking, stakingPeriod } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000))
    await mineBlocks(wallet, stakingPeriod)
    await staking.withdraw(0, wallet.address)

    await expect(staking.withdraw(0, wallet.address)).to.be.revertedWith('IS_ALREADY_WITHDRAWN')
  })

  it('withdraw with zero address', async () => {
    const { token, wallet, staking, stakingPeriod, other } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    await staking.deposit(amount)
    await mineBlocks(wallet, stakingPeriod)

    await expect(staking.withdraw(0, constants.AddressZero)).to.be.revertedWith('IS_ADDRESS_ZERO')

    await staking.withdraw(0, other.address)

    expect(await token.balanceOf(other.address)).to.be.equal(amount)
  })

  it('withdraw with blacklisted address', async () => {
    const { token, wallet, staking, stakingPeriod, other } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    await staking.deposit(amount)
    await mineBlocks(wallet, stakingPeriod)

    await token.setBlacklisted(other.address, true)
    await expect(staking.withdraw(0, other.address)).to.be.revertedWith('TH_TRANSFER_FAILED')

    await token.setBlacklisted(other.address, false)
    await staking.withdraw(0, other.address)

    expect(await token.balanceOf(other.address)).to.be.equal(amount)
  })

  it('change voting power', async () => {
    const { wallet, staking, stakingPeriod } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    await mineBlocks(wallet, 1)
    expect(await staking.getCurrentVotes(wallet.address)).to.be.equal(0)

    await staking.deposit(amount)

    await mineBlocks(wallet, 1)
    expect(await staking.getCurrentVotes(wallet.address)).to.be.equal(amount)

    await mineBlocks(wallet, stakingPeriod)
    await staking.withdraw(0, wallet.address)

    await mineBlocks(wallet, 1)
    expect(await staking.getCurrentVotes(wallet.address)).to.be.equal(0)
  })
})
