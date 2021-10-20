import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlocks, overrides } from '../shared/utilities'

describe('IntegralStaking.stopIssuance', () => {
  const loadFixture = setupFixtureLoader()

  it('caller must be owner', async () => {
    const { provider, staking, other } = await loadFixture(stakingFixture)
    await expect(staking.connect(other).stopIssuance(await provider.getBlockNumber())).to.be.revertedWith(
      'IS_FORBIDDEN'
    )
  })

  it('revert deposit after stop block', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await expect(staking.stopIssuance(5)).to.emit(staking, 'StopIssuance').withArgs(5)
    await mineBlocks(wallet, 2)

    await expect(staking.deposit(expandTo18Decimals(1_000_000_000))).to.be.revertedWith('IS_ALREADY_STOPPED')
  })

  it('allow deposit after stop issuance before stop block', async () => {
    const { wallet, staking, provider } = await loadFixture(stakingFixture)

    const stopBlock = (await provider.getBlockNumber()) + 10
    await expect(staking.stopIssuance(stopBlock)).to.emit(staking, 'StopIssuance').withArgs(stopBlock)

    await expect(staking.deposit(expandTo18Decimals(1_000_000_000)))
      .to.emit(staking, 'Deposit')
      .withArgs(wallet.address, 0, expandTo18Decimals(1_000_000_000))
  })

  it('same claimable amount after issuance stop', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000), overrides)
    await mineBlocks(wallet, 2)

    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(20_000_000))

    await expect(staking.stopIssuance(8, overrides)).to.emit(staking, 'StopIssuance').withArgs(8)

    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(30_000_000))
    await mineBlocks(wallet, 2)
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(30_000_000))
  })

  it('can withdraw after stop issuance', async () => {
    const { wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1_000_000_000), overrides)

    await expect(staking.withdraw(0, wallet.address, overrides)).to.be.revertedWith('IS_LOCKED')
    await expect(staking.stopIssuance(8, overrides)).to.emit(staking, 'StopIssuance').withArgs(8)

    await mineBlocks(wallet, 1)
    await staking.withdraw(0, wallet.address, overrides)
  })
})
