import { expect } from 'chai'
import { constants, BigNumber, utils } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { getDefaultWithdraw, withdrawAndWait } from '../shared/orders'
import { OrderType } from '../shared/OrderType'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides, pairAddressToPairId } from '../shared/utilities'

describe('IntegralDelay.withdraw', () => {
  const loadFixture = setupFixtureLoader()

  describe('checks', () => {
    it('fails if the deadline is exceeded', async () => {
      const { delay, token0, token1, wallet, provider } = await loadFixture(delayFixture)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)
      withdrawRequest.submitDeadline = BigNumber.from(await provider.getBlockNumber())

      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_EXPIRED')
    })

    it('reverts when both min token amounts are zero', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)
      withdrawRequest.liquidity = BigNumber.from(0)

      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_NO_LIQUIDITY')
    })

    it('reverts when address to is not set', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)
      withdrawRequest.to = constants.AddressZero

      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_NO_ADDRESS')
    })

    it('reverts when gasLimit is lower than minimum', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)
      withdrawRequest.gasLimit = 999

      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_GAS_LIMIT_TOO_LOW')
    })

    it('reverts when gasLimit is higher than maximum', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)
      withdrawRequest.gasLimit = 160001

      await delay.setMaxGasLimit(160000, overrides)
      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_GAS_LIMIT_TOO_HIGH')
    })

    it('reverts when pair does not exist', async () => {
      const { delay, token0, token, wallet } = await loadFixture(delayFixture)
      const withdrawRequest = getDefaultWithdraw(token, token0, wallet)

      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_PAIR_NONEXISTENT')
    })

    it('reverts when no ether was sent', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)

      await delay.setGasPrice(100, overrides)
      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when not enough ether was sent', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)

      const gasPrice = 100
      await delay.setGasPrice(gasPrice, overrides)
      await expect(
        delay.withdraw(withdrawRequest, {
          ...overrides,
          value: withdrawRequest.gasLimit * gasPrice - 1,
        })
      ).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when deadline is less than 5 min', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const currentTimeUnix = Math.floor(Date.now() / 1000)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)
      withdrawRequest.executionDeadline = BigNumber.from(currentTimeUnix + 5 * 60 - 1)

      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_INVALID_DEADLINE')
    })

    it('reverts when withdraw is disabled', async () => {
      const { delay, token0, token1, wallet, pair } = await loadFixture(delayFixture)
      await delay.setOrderDisabled(pair.address, OrderType.Withdraw, true, overrides)
      const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)
      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_WITHDRAW_DISABLED')

      await delay.setOrderDisabled(pair.address, OrderType.Withdraw, false)
      await expect(delay.withdraw(withdrawRequest, overrides)).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })
  })

  it('refunds excess value', async () => {
    const { delay, pair, token0, token1, addLiquidity, wallet } = await loadFixture(delayFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const gasPrice = utils.parseUnits('69.420', 'gwei')
    const excess = 12345
    await delay.setGasPrice(gasPrice, overrides)

    const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)
    const value = gasPrice.mul(withdrawRequest.gasLimit)

    await pair.approve(delay.address, constants.MaxUint256, overrides)

    const balanceBefore = await wallet.getBalance()
    const delayBalanceBefore = await wallet.provider.getBalance(delay.address)

    await delay.withdraw(withdrawRequest, {
      ...overrides,
      gasPrice: 0,
      value: value.add(excess),
    })

    const balanceAfter = await wallet.getBalance()
    const delayBalanceAfter = await wallet.provider.getBalance(delay.address)

    expect(balanceBefore.sub(balanceAfter)).to.equal(value)
    expect(delayBalanceAfter.sub(delayBalanceBefore)).to.eq(value)
  })

  it('deposits liquidity', async () => {
    const { delay, pair, token0, token1, addLiquidity, wallet } = await loadFixture(delayFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))

    const gasPrice = utils.parseUnits('69.420', 'gwei')
    await delay.setGasPrice(gasPrice, overrides)

    const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)

    const liquidityBefore = await pair.balanceOf(wallet.address)
    const delayLiquidityBefore = await pair.balanceOf(delay.address)

    await pair.approve(delay.address, constants.MaxUint256, overrides)

    await delay.withdraw(withdrawRequest, {
      ...overrides,
      gasPrice: 0,
      value: gasPrice.mul(withdrawRequest.gasLimit),
    })

    const liquidityAfter = await pair.balanceOf(wallet.address)
    const delayLiquidityAfter = await pair.balanceOf(delay.address)

    expect(liquidityBefore.sub(liquidityAfter)).to.equal(withdrawRequest.liquidity)
    expect(delayLiquidityAfter.sub(delayLiquidityBefore)).to.eq(withdrawRequest.liquidity)
  })

  it('enqueues an order', async () => {
    const { delay, token0, token1, addLiquidity, wallet, pair } = await loadFixture(delayFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const gasPrice = utils.parseUnits('69.420', 'gwei')
    await delay.setGasPrice(gasPrice, overrides)

    const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)

    await pair.approve(delay.address, constants.MaxUint256, overrides)

    const tx = await delay.withdraw(withdrawRequest, {
      ...overrides,
      value: gasPrice.mul(withdrawRequest.gasLimit),
    })
    const { timestamp } = await wallet.provider.getBlock((await tx.wait()).blockHash)

    const newestOrderId = await delay.newestOrderId()
    const { orderType, validAfterTimestamp } = await delay.getOrder(newestOrderId)
    const result = await delay.getWithdrawOrder(newestOrderId)

    expect(orderType).to.equal(OrderType.Withdraw)
    expect(validAfterTimestamp).to.equal((await delay.delay()).add(timestamp))

    expect([...result]).to.deep.equal([
      pairAddressToPairId(pair.address),
      withdrawRequest.liquidity,
      withdrawRequest.amount0Min,
      withdrawRequest.amount1Min,
      withdrawRequest.unwrap,
      wallet.address,
      BigNumber.from(gasPrice),
      BigNumber.from(withdrawRequest.gasLimit),
      constants.MaxUint256,
    ])
  })

  it('enqueues an order with reverse tokens', async () => {
    const { delay, token0, token1, wallet, pair, addLiquidity } = await loadFixture(delayFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const withdrawRequest = await withdrawAndWait(delay, pair, token1, token0, wallet)
    const result = await delay.getWithdrawOrder(await delay.newestOrderId())

    expect([...result]).to.deep.equal([
      pairAddressToPairId(pair.address),
      withdrawRequest.liquidity,
      // because we swapped before this is actually 0 and 1, not 1 and 0
      withdrawRequest.amount1Min,
      withdrawRequest.amount0Min,
      withdrawRequest.unwrap,
      wallet.address,
      BigNumber.from(withdrawRequest.gasPrice),
      BigNumber.from(withdrawRequest.gasLimit),
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

    await withdrawAndWait(delay, pair, token0, token1, wallet)

    const [reference0, reference1] = await pair.getReferences()
    const [reserve0, reserve1] = await pair.getReserves()
    expect(reference0).to.eq(reserve0)
    expect(reference1).to.eq(reserve1)
  })

  it('returns orderId', async () => {
    const { delay, orderIdTest, token0, token1, wallet, pair, addLiquidity } = await loadFixture(delayFixture)
    const gasPrice = await delay.gasPrice()
    const withdrawRequest = getDefaultWithdraw(token0, token1, wallet)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    await pair.transfer(orderIdTest.address, utils.parseEther('1'), overrides)
    await orderIdTest.approve(pair.address, delay.address, constants.MaxUint256, overrides)

    await expect(
      orderIdTest.withdraw(withdrawRequest, {
        ...overrides,
        value: gasPrice.mul(withdrawRequest.gasLimit),
      })
    )
      .to.emit(orderIdTest, 'OrderId')
      .withArgs(1)
  })
})
