import { expect } from 'chai'
import { constants, utils, BigNumber, Wallet } from 'ethers'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, overrides } from './shared/utilities'
import { setupFixtureLoader } from './shared/setup'

import { ERC20__factory, IntegralLPToken } from '../build/types'

const TOTAL_SUPPLY = expandTo18Decimals(10000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('IntegralLPToken', () => {
  const loadFixture = setupFixtureLoader()

  async function fixture([wallet]: Wallet[]) {
    const token = await new ERC20__factory(wallet).deploy(TOTAL_SUPPLY, overrides)
    return { token }
  }

  let token: IntegralLPToken
  let wallet: Wallet
  let other: Wallet
  beforeEach(async () => {
    ;({ token, wallet, other } = await loadFixture(fixture))
  })

  it('correctly sets up the initial state', async () => {
    const name = await token.name()
    expect(name).to.eq('Integral LP')
    expect(await token.symbol()).to.eq('ITGR-LP')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY)
    expect(await token.DOMAIN_SEPARATOR()).to.eq(
      utils.keccak256(
        utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            utils.keccak256(
              utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
            ),
            utils.keccak256(utils.toUtf8Bytes(name)),
            utils.keccak256(utils.toUtf8Bytes('1')),
            1,
            token.address,
          ]
        )
      )
    )
    expect(await token.PERMIT_TYPEHASH()).to.eq(
      utils.keccak256(
        utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
      )
    )
  })

  it('allows for reinitialising DOMAIN_SEPARATOR', async () => {
    const separator = await token.DOMAIN_SEPARATOR()
    // Ideally we would change chainId here. It is not possible in Ganache
    await token.updateDomainSeparator()
    const updated = await token.DOMAIN_SEPARATOR()
    expect(updated).to.equal(separator)
  })

  it('implements approve', async () => {
    await expect(token.approve(other.address, TEST_AMOUNT, overrides))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
  })

  it('implements increaseAllowance', async () => {
    await token.approve(other.address, TEST_AMOUNT, overrides)
    await expect(token.increaseAllowance(other.address, 1, overrides))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT.add(1))
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT.add(1))
  })

  it('implements decreaseAllowance', async () => {
    await token.approve(other.address, TEST_AMOUNT, overrides)
    await expect(token.decreaseAllowance(other.address, 1, overrides))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT.sub(1))
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT.sub(1))
  })

  it('fails decreaseAllowance below zero', async () => {
    await token.approve(other.address, TEST_AMOUNT, overrides)
    await expect(token.decreaseAllowance(other.address, TEST_AMOUNT.add(1), overrides)).to.be.revertedWith(
      'IA_CANNOT_DECREASE'
    )
  })

  it('implements transfer', async () => {
    await expect(token.transfer(other.address, TEST_AMOUNT, overrides))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('fails the transfer when there are not enough funds', async () => {
    await expect(token.transfer(other.address, TOTAL_SUPPLY.add(1), overrides)).to.be.revertedWith('SM_SUB_UNDERFLOW')
    await expect(token.connect(other).transfer(wallet.address, 1, overrides)).to.be.revertedWith('SM_SUB_UNDERFLOW')
  })

  it('implements transferFrom', async () => {
    await token.approve(other.address, TEST_AMOUNT, overrides)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT, overrides))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(0)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('does not decrease infinite allowance', async () => {
    await token.approve(other.address, constants.MaxUint256, overrides)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT, overrides))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(constants.MaxUint256)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('implements permit', async () => {
    const nonce = await token.nonces(wallet.address)
    const deadline = constants.MaxUint256
    const digest = await getApprovalDigest(
      token,
      { owner: wallet.address, spender: other.address, value: TEST_AMOUNT },
      nonce,
      deadline
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await expect(
      token.permit(
        wallet.address,
        other.address,
        TEST_AMOUNT,
        deadline,
        v,
        utils.hexlify(r),
        utils.hexlify(s),
        overrides
      )
    )
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
    expect(await token.nonces(wallet.address)).to.eq(BigNumber.from(1))
  })
})
