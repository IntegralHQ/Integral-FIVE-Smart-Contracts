import { constants } from 'ethers'
import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralStaking.withdrawAll', () => {
  const loadFixture = setupFixtureLoader()

  it('withraw all', async () => {
    const { wallet, token, staking, stakingPeriod } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    await staking.deposit(amount)
    await staking.deposit(amount)

    await mineBlocks(wallet, stakingPeriod)

    expect(await staking.getTotalStaked(wallet.address)).to.be.equal(amount.mul(2))

    await expect(staking.withdrawAll(wallet.address))
      .to.emit(staking, 'WithdrawAll')
      .withArgs(wallet.address, amount.mul(2), wallet.address)

    expect(await token.balanceOf(staking.address)).to.be.equal(0)

    const userStake1 = await staking.userStakes(wallet.address, 0)
    expect(userStake1.withdrawn).not.be.equal(false)
    const userStake2 = await staking.userStakes(wallet.address, 1)
    expect(userStake2.withdrawn).not.be.equal(false)

    expect(await staking.getTotalStaked(wallet.address)).to.be.equal(0)
  })

  it('withdraw all with zero address', async () => {
    const { token, wallet, staking, stakingPeriod, other } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1_000_000_000)

    await staking.deposit(amount)

    await mineBlocks(wallet, stakingPeriod)
    await expect(staking.withdrawAll(constants.AddressZero)).to.be.revertedWith('IS_ADDRESS_ZERO')

    await staking.withdraw(0, other.address)

    expect(await token.balanceOf(other.address)).to.be.equal(amount)
  })
})
