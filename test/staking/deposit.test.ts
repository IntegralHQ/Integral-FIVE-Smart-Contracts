import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralStaking.deposit', () => {
  const loadFixture = setupFixtureLoader()

  it('check allowance', async () => {
    const { token, staking } = await loadFixture(stakingFixture)
    await token.approve(staking.address, 0)

    await expect(staking.deposit(expandTo18Decimals(1_000_000_000))).to.be.revertedWith('TH_TRANSFER_FROM_FAILED')
  })

  it('deposit zero amount', async () => {
    const { staking } = await loadFixture(stakingFixture)

    await expect(staking.deposit(0)).to.be.revertedWith('IS_INVALID_AMOUNT')
  })

  it('change balance', async () => {
    const { wallet, token, staking } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    await expect(staking.deposit(amount)).to.emit(staking, 'Deposit').withArgs(wallet.address, 0, amount)

    expect(await token.balanceOf(staking.address)).to.equal(amount)
  })

  it('multiple deposits', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    await expect(staking.deposit(amount)).to.emit(staking, 'Deposit').withArgs(wallet.address, 0, amount)

    expect(await staking.getUserStakesCount(wallet.address)).to.be.equal(1)

    await expect(staking.deposit(amount.mul(2)))
      .to.emit(staking, 'Deposit')
      .withArgs(wallet.address, 1, amount.mul(2))

    expect(await staking.getUserStakesCount(wallet.address)).to.be.equal(2)

    const userStake1 = await staking.userStakes(wallet.address, 0)
    expect(userStake1.lockedAmount).to.be.equal(amount)

    const userStake2 = await staking.userStakes(wallet.address, 1)
    expect(userStake2.lockedAmount).to.be.equal(amount.mul(2))

    expect(await staking.getTotalStaked(wallet.address)).to.be.equal(amount.mul(3))
  })

  it('change voting power', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    expect(await staking.getCurrentVotes(wallet.address)).to.be.equal(0)

    await staking.deposit(amount)

    await mineBlocks(wallet, 1)
    expect(await staking.getCurrentVotes(wallet.address)).to.be.equal(amount)
  })
})
