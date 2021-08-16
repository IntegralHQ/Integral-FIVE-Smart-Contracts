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
    await staking.deposit(expandTo18Decimals(1))
    await mineBlocks(wallet, 4)

    await staking.deposit(expandTo18Decimals(2))

    await mineBlocks(wallet, 3)

    await staking.deposit(expandTo18Decimals(3))
  })

  it('withdraw first staking', async () => {
    await mineBlocks(wallet, 1)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(expandTo18Decimals(0.1))
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(0.1))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(0.03))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.23))

    await staking.withdraw(0, other.address)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(expandTo18Decimals(0.1))
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(0.12))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(0.06))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.28))
    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(1))
  })

  it('claim first staking', async () => {
    await staking.claim(0, other.address)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(0.14))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(0.09))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.23))
    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(1.1))
  })

  it('claim all', async () => {
    await staking.claimAll(other.address)

    expect(await staking.getClaimable(wallet.address, 0)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(0)
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(0)
    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(1.38))
  })

  it('withdraw all', async () => {
    await mineBlocks(wallet, 3)

    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(0.04))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(0.09))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.13))

    await staking.withdrawAll(other.address)

    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(0.04))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(0.12))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.16))

    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(3.38))
  })

  it('claim all after staking period', async () => {
    await mineBlocks(wallet, 10)

    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(expandTo18Decimals(0.04))
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(expandTo18Decimals(0.18))
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(expandTo18Decimals(0.22))

    await staking.claimAll(other.address)

    expect(await staking.getClaimable(wallet.address, 1)).to.be.equal(0)
    expect(await staking.getClaimable(wallet.address, 2)).to.be.equal(0)
    expect(await staking.getAllClaimable(wallet.address)).to.be.equal(0)
    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(3.6))
  })

  it('withdraw all after staking period', async () => {
    await staking.withdrawAll(other.address)

    expect(await token.balanceOf(other.address)).to.be.equal(expandTo18Decimals(6.6))
  })
})
