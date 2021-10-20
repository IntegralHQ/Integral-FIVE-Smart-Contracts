import { expect } from 'chai'
import { constants, BigNumber, utils } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { OrderType } from '../shared/OrderType'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides, pairAddressToPairId } from '../shared/utilities'
import { getDefaultDeposit, getOrderedTokens, depositAndWait } from '../shared/orders'

describe('IntegralDelay.deposit', () => {
  const loadFixture = setupFixtureLoader()

  describe('checks', () => {
    it('reverts when token transfer cost is unset', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      depositRequest.token0 = constants.AddressZero
      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_TOKEN_TRANSFER_GAS_COST_UNSET')
    })

    it('reverts when both token amounts are zero', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      depositRequest.amount0 = BigNumber.from(0)
      depositRequest.amount1 = BigNumber.from(0)

      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_NO_AMOUNT')
    })

    it('reverts when address to is not set', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      depositRequest.to = constants.AddressZero

      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_NO_ADDRESS')
    })

    it('reverts when gasLimit is lower than minimum', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      depositRequest.gasLimit = 999

      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_GAS_LIMIT_TOO_LOW')
    })

    it('reverts when gasLimit is higher than maximum', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      depositRequest.gasLimit = 160001

      await delay.setMaxGasLimit(160000)
      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_GAS_LIMIT_TOO_HIGH')
    })

    it('reverts when pair does not exist', async () => {
      const { delay, token0, token, wallet } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token, token0, wallet)

      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_PAIR_NONEXISTENT')
    })

    it('reverts when no ether was sent', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)

      await delay.setGasPrice(100)
      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when not enough ether was sent', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)

      const gasPrice = 100
      await delay.setGasPrice(gasPrice, overrides)
      await expect(
        delay.deposit(depositRequest, {
          ...overrides,
          value: depositRequest.gasLimit * gasPrice - 1,
        })
      ).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('accounts for weth being used', async () => {
      const { delay, token, weth, wallet } = await loadFixture(delayFixture)

      const gasLimit = 10000
      const gasPrice = 100
      await delay.setGasPrice(gasPrice, overrides)

      const [token0, token1] = getOrderedTokens(token, weth)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      depositRequest.amount0 = BigNumber.from(100)
      depositRequest.amount1 = BigNumber.from(100)
      depositRequest.wrap = true

      await expect(
        delay.deposit(depositRequest, {
          ...overrides,
          value: gasLimit * gasPrice,
        })
      ).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('fails if the deadline is exceeded', async () => {
      const { delay, token0, token1, wallet, provider } = await loadFixture(delayFixture)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      depositRequest.submitDeadline = BigNumber.from(await provider.getBlockNumber())

      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_EXPIRED')
    })

    it('reverts when deadline is less than 5 min', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const currentTimeUnix = Math.floor(Date.now() / 1000)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      depositRequest.executionDeadline = BigNumber.from(currentTimeUnix)

      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_INVALID_DEADLINE')
    })

    it('reverts when deposit is disabled', async () => {
      const { delay, token0, token1, wallet, pair } = await loadFixture(delayFixture)
      await delay.setOrderDisabled(pair.address, OrderType.Deposit, true, overrides)
      const depositRequest = getDefaultDeposit(token0, token1, wallet)
      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_DEPOSIT_DISABLED')

      await delay.setOrderDisabled(pair.address, OrderType.Deposit, false)
      await expect(delay.deposit(depositRequest, overrides)).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })
  })

  it('refunds excess value', async () => {
    const { delay, token, weth, wallet } = await loadFixture(delayFixture)

    const gasPrice = utils.parseUnits('100', 'gwei')
    await delay.setGasPrice(gasPrice, overrides)

    await token.approve(delay.address, constants.MaxUint256, overrides)

    const balanceBefore = await wallet.getBalance()

    const [token0, token1] = getOrderedTokens(token, weth)
    const depositRequest = getDefaultDeposit(token0, token1, wallet)
    const wethAmount = 1000
    const excess = 1234
    depositRequest.amount0 = BigNumber.from(wethAmount)
    depositRequest.amount1 = BigNumber.from(wethAmount)
    const value = gasPrice.mul(depositRequest.gasLimit).add(wethAmount)
    depositRequest.wrap = true

    await delay.deposit(depositRequest, {
      ...overrides,
      gasPrice: 0,
      value: value.add(excess),
    })

    const balanceAfter = await wallet.getBalance()
    expect(balanceBefore.sub(balanceAfter)).to.equal(value)
    expect(await wallet.provider.getBalance(delay.address)).to.eq(value.sub(wethAmount))
  })

  it('enqueues an order', async () => {
    const { delay, token0, token1, wallet, pair } = await loadFixture(delayFixture)

    const gasPrice = utils.parseUnits('69.420', 'gwei')
    await delay.setGasPrice(gasPrice)

    const depositRequest = getDefaultDeposit(token0, token1, wallet)
    depositRequest.gasPrice = gasPrice

    await token0.approve(delay.address, constants.MaxUint256, overrides)
    await token1.approve(delay.address, constants.MaxUint256, overrides)

    const tx = await delay.deposit(depositRequest, {
      ...overrides,
      value: BigNumber.from(depositRequest.gasLimit).mul(gasPrice),
    })
    const { timestamp } = await wallet.provider.getBlock((await tx.wait()).blockHash)

    const newestOrderId = await delay.newestOrderId()
    const { orderType, validAfterTimestamp } = await delay.getOrder(newestOrderId)
    const result = await delay.getDepositOrder(newestOrderId)

    expect(orderType).to.equal(OrderType.Deposit)
    expect(validAfterTimestamp).to.equal((await delay.delay()).add(timestamp))

    expect([...result]).to.deep.equal([
      pairAddressToPairId(pair.address),
      depositRequest.amount0,
      depositRequest.amount1,
      BigNumber.from(depositRequest.initialRatio),
      BigNumber.from(depositRequest.minRatioChangeToSwap),
      depositRequest.minSwapPrice,
      depositRequest.maxSwapPrice,
      depositRequest.wrap,
      wallet.address,
      BigNumber.from(depositRequest.gasPrice),
      BigNumber.from(depositRequest.gasLimit),
      constants.MaxUint256,
    ])
  })

  it('enqueues an order with reverse tokens', async () => {
    const { delay, token0, token1, wallet, pair } = await loadFixture(delayFixture)

    const depositRequest = await depositAndWait(delay, token1, token0, wallet)
    const result = await delay.getDepositOrder(await delay.newestOrderId())

    expect([...result]).to.deep.equal([
      pairAddressToPairId(pair.address),
      // because we swapped before this is actually 0 and 1, not 1 and 0
      depositRequest.amount1,
      depositRequest.amount0,
      BigNumber.from(depositRequest.initialRatio),
      BigNumber.from(depositRequest.minRatioChangeToSwap),
      depositRequest.minSwapPrice,
      depositRequest.maxSwapPrice,
      depositRequest.wrap,
      wallet.address,
      BigNumber.from(depositRequest.gasPrice),
      BigNumber.from(depositRequest.gasLimit),
      constants.MaxUint256,
    ])
  })

  it('sync with oracle', async () => {
    const { delay, pair, oracle, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(1000), expandTo18Decimals(1000))

    await oracle.setPrice(expandTo18Decimals(1), overrides)
    await token1.transfer(pair.address, expandTo18Decimals(250), overrides)
    await pair.swap(expandTo18Decimals(200), 0, wallet.address, overrides)

    await oracle.setPrice(expandTo18Decimals(1), overrides)

    await depositAndWait(delay, token0, token1, wallet, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(1),
    })

    const [reference0, reference1] = await pair.getReferences()
    const [reserve0, reserve1] = await pair.getReserves()
    expect(reference0).to.eq(reserve0)
    expect(reference1).to.eq(reserve1)
  })

  it('returns orderId', async () => {
    const { delay, orderIdTest, token0, token1, wallet } = await loadFixture(delayFixture)
    const gasPrice = await delay.gasPrice()
    const depositRequest = getDefaultDeposit(token0, token1, wallet)

    await token0.transfer(orderIdTest.address, utils.parseEther('10'), overrides)
    await token1.transfer(orderIdTest.address, utils.parseEther('10'), overrides)
    await orderIdTest.approve(token0.address, delay.address, constants.MaxUint256, overrides)
    await orderIdTest.approve(token1.address, delay.address, constants.MaxUint256, overrides)

    await expect(
      orderIdTest.deposit(depositRequest, {
        ...overrides,
        value: gasPrice.mul(depositRequest.gasLimit),
      })
    )
      .to.emit(orderIdTest, 'OrderId')
      .withArgs(1)
  })
})
