import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'

describe('IntegralStaking.getClaimable', () => {
  const loadFixture = setupFixtureLoader()

  it('claim with invalid stake id', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await expect(staking.getClaimable(wallet.address, 0)).to.be.revertedWith('IS_INVALID_ID')

    await staking.deposit(expandTo18Decimals(1))

    await mineBlocks(wallet, 2)

    await expect(staking.getClaimable(wallet.address, 1)).to.be.revertedWith('IS_INVALID_ID')
  })

  it('can get claimable amount per stake', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await mineBlocks(wallet, 2)

    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(0.02))
  })

  it('can get total claimable amount', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)
    const amount = expandTo18Decimals(1)

    await staking.deposit(amount)
    await staking.deposit(amount)

    await mineBlocks(wallet, 2)

    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(0.03))
    expect(await staking.getClaimable(wallet.address, 1)).to.equal(expandTo18Decimals(0.02))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.05))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(
      (await staking.getClaimable(wallet.address, 0)).add(await staking.getClaimable(wallet.address, 1))
    )
  })

  it('claimable amount should be the same after staking period', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await mineBlocks(wallet, 5)
    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(0.05))

    await mineBlocks(wallet, 5)
    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(0.1))

    await mineBlocks(wallet, 5)
    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(0.1))
  })
})
