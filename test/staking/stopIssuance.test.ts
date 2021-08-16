import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlock, mineBlocks } from '../shared/utilities'

describe('IntegralStaking.stopIssuance', () => {
  const loadFixture = setupFixtureLoader()

  it('caller must be owner', async () => {
    const { provider, staking, other } = await loadFixture(stakingFixture)
    await expect(staking.connect(other).stopIssuance(await provider.getBlockNumber())).to.be.revertedWith(
      'IS_FORBIDDEN'
    )
  })

  it('revert deposit after issuance stop', async () => {
    const { wallet, provider, staking } = await loadFixture(stakingFixture)

    const stopBlock = (await provider.getBlockNumber()) + 1
    await expect(staking.stopIssuance(stopBlock)).to.emit(staking, 'StopIssuance').withArgs(stopBlock)

    await mineBlock(wallet)
    await expect(staking.deposit(expandTo18Decimals(1))).to.be.revertedWith('IS_ALREADY_STOPPED')
  })

  it('same claimable amount after issuance stop', async () => {
    const { provider, wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await mineBlocks(wallet, 2)

    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.02))

    const stopBlock = (await provider.getBlockNumber()) + 1
    await expect(staking.stopIssuance(stopBlock)).to.emit(staking, 'StopIssuance').withArgs(stopBlock)

    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.03))

    await mineBlocks(wallet, 2)

    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.03))
  })

  it('can withdraw after stop issuance', async () => {
    const { provider, wallet, staking } = await loadFixture(stakingFixture)

    await staking.deposit(expandTo18Decimals(1))

    await expect(staking.withdraw(0, wallet.address)).to.be.revertedWith('IS_LOCKED')

    const stopBlock = (await provider.getBlockNumber()) + 1
    await expect(staking.stopIssuance(stopBlock)).to.emit(staking, 'StopIssuance').withArgs(stopBlock)

    await mineBlocks(wallet, 1)

    await staking.withdraw(0, wallet.address)
  })
})
