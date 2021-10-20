import { setupFixtureLoader } from '../shared/setup'
import { stakingFixture } from '../shared/fixtures'
import { expect } from 'chai'
import { expandTo18Decimals, mineBlocks } from '../shared/utilities'
import { Wallet } from '@ethersproject/wallet'
import { IntegralStaking, IntegralToken } from '../../build/types'

describe('IntegralStaking.integration', () => {
  const loadFixture = setupFixtureLoader()

  let wallet: Wallet, token: IntegralToken, staking: IntegralStaking, other: Wallet

  before(async () => {
    ;({ wallet, token, staking, other } = await loadFixture(stakingFixture))
  })

  it('three deposits', async () => {
    await staking.deposit(expandTo18Decimals(1_000_000_000))
    await mineBlocks(wallet, 4)

    await staking.deposit(expandTo18Decimals(2_000_000_000))

    await mineBlocks(wallet, 3)

    await staking.deposit(expandTo18Decimals(3_000_000_000))
  })

  it('withdraw first staking', async () => {
    await mineBlocks(wallet, 1)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(expandTo18Decimals(100_000_000))
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(100_000_000))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(30_000_000))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(230_000_000))

    await staking.withdraw(0, other.address)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(expandTo18Decimals(100_000_000))
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(120_000_000))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(60_000_000))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(280_000_000))
    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(1_000_000_000))
  })

  it('claim first staking', async () => {
    await staking.claim(0, other.address)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(140_000_000))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(90_000_000))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(230_000_000))
    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(1_100_000_000))
  })

  it('claim all', async () => {
    await staking.claimAll(other.address)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(0)
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(0)
    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(1_380_000_000))
  })

  it('withdraw all', async () => {
    await mineBlocks(wallet, 3)

    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(40_000_000))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(90_000_000))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(130_000_000))

    await staking.withdrawAll(other.address)

    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(40_000_000))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(120_000_000))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(160_000_000))

    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(3_380_000_000))
  })

  it('claim all after staking period', async () => {
    await mineBlocks(wallet, 10)

    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(40_000_000))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(180_000_000))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(220_000_000))

    await staking.claimAll(other.address)

    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(0)
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(0)
    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(3_600_000_000))
  })

  it('withdraw all after staking period', async () => {
    await staking.withdrawAll(other.address)

    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(6_600_000_000))
  })
})
