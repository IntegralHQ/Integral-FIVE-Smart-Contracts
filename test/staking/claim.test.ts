import { constants } from 'ethers'
import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralStaking.claim', () => {
  const loadFixture = setupFixtureLoader()

  it('invalid index', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await expect(staking.claim(1, wallet.address)).to.be.revertedWith('IS_INVALID_ID')
  })

  it('claim each stake', async () => {
    const { wallet, token, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await mineBlocks(wallet, 2)

    const balanceBefore = await token.balanceOf(wallet.address)
    await expect(staking.claim(0, wallet.address))
      .to.emit(staking, 'Claim')
      .withArgs(wallet.address, 0, expandTo18Decimals(0.03), wallet.address)

    expect(await token.balanceOf(wallet.address)).to.equal(balanceBefore.add(expandTo18Decimals(0.03)))
    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(0)
  })

  it('cannot claim twice', async () => {
    const { wallet, staking, stakingPeriod } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await mineBlocks(wallet, stakingPeriod)
    await expect(staking.claim(0, wallet.address))
      .to.emit(staking, 'Claim')
      .withArgs(wallet.address, 0, expandTo18Decimals(0.1), wallet.address)

    await expect(staking.claim(0, wallet.address)).to.be.revertedWith('IS_ALREADY_CLAIMED')
  })

  it('claim after withdraw', async () => {
    const { wallet, staking, stakingPeriod } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await mineBlocks(wallet, stakingPeriod)

    await staking.withdraw(0, wallet.address)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(expandTo18Decimals(0.1))

    await expect(staking.claim(0, wallet.address))
      .to.emit(staking, 'Claim')
      .withArgs(wallet.address, 0, expandTo18Decimals(0.1), wallet.address)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(0)
  })

  it('claim with zero address', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await mineBlocks(wallet, 2)
    await expect(staking.claim(0, constants.AddressZero)).to.be.revertedWith('IS_ADDRESS_ZERO')
  })
})
