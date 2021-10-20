import { constants } from 'ethers'
import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralStaking.claimAll', () => {
  const loadFixture = setupFixtureLoader()

  it('claim all', async () => {
    const { wallet, token, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000))
    await staking.deposit(expandTo18Decimals(1_000_000_000))
    await mineBlocks(wallet, 2)

    const balanceBefore = await token.balanceOf(wallet.address)
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(50_000_000))
    await expect(staking.claimAll(wallet.address))
      .to.emit(staking, 'ClaimAll')
      .withArgs(wallet.address, expandTo18Decimals(70_000_000), wallet.address)

    expect(await token.balanceOf(wallet.address)).to.equal(balanceBefore.add(expandTo18Decimals(70_000_000)))
    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(0)
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(0)
  })

  it('claim all with zero address', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000))
    await mineBlocks(wallet, 2)

    await expect(staking.claimAll(constants.AddressZero)).to.be.revertedWith('IS_ADDRESS_ZERO')
  })
})
