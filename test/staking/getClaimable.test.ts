import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, MAX_UINT_96, mineBlocks, overrides } from '../shared/utilities'

describe('IntegralStaking.getClaimable', () => {
  const loadFixture = setupFixtureLoader()

  it('claim with invalid stake id', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await expect(staking.getClaimable(wallet.address, 0)).to.be.revertedWith('IS_INVALID_ID')

    await staking.deposit(expandTo18Decimals(1_000_000_000))

    await mineBlocks(wallet, 2)

    await expect(staking.getClaimable(wallet.address, 1)).to.be.revertedWith('IS_INVALID_ID')
  })

  it('can get claimable amount per stake', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000))

    await mineBlocks(wallet, 2)

    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(20_000_000))
  })

  it('does not perform overflow for a large stake', async () => {
    const { other, staking, token } = await loadFixture(stakingFixture)
    await token.mint(other.address, MAX_UINT_96, overrides)

    await token.connect(other).approve(staking.address, MAX_UINT_96, overrides)
    await staking.connect(other).deposit(MAX_UINT_96)

    await mineBlocks(other, 2)

    expect(await staking.getClaimable(other.address, 0)).to.equal(MAX_UINT_96.mul(2).div(100))
  })

  it('can get total claimable amount', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000))
    await staking.deposit(expandTo18Decimals(1_000_000_000))

    await mineBlocks(wallet, 2)

    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(30_000_000))
    expect(await staking.getClaimable(wallet.address, 1)).to.equal(expandTo18Decimals(20_000_000))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(50_000_000))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(
      (await staking.getClaimable(wallet.address, 0)).add(await staking.getClaimable(wallet.address, 1))
    )
  })

  it('claimable amount should be the same after staking period', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000))

    await mineBlocks(wallet, 5)
    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(50_000_000))

    await mineBlocks(wallet, 5)
    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(100_000_000))

    await mineBlocks(wallet, 5)
    expect(await staking.getClaimable(wallet.address, 0)).to.equal(expandTo18Decimals(100_000_000))
  })
})
