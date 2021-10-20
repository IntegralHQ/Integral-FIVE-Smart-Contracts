import { expect } from 'chai'
import { constants, BigNumber, utils } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { getDefaultSell, sellAndWait } from '../shared/orders'
import { OrderType } from '../shared/OrderType'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides, pairAddressToPairId } from '../shared/utilities'

describe('IntegralDelay.sell', () => {
  const loadFixture = setupFixtureLoader()

  describe('checks', () => {
    it('accounts for weth being used', async () => {
      const { delay, token, weth, wallet } = await loadFixture(delayFixture)

      const gasLimit = 10000
      const gasPrice = 100
      await delay.setGasPrice(gasPrice)

      const sellRequest = getDefaultSell(weth, token, wallet)
      sellRequest.amountIn = BigNumber.from(100)
      sellRequest.wrapUnwrap = true

      await expect(
        delay.sell(sellRequest, {
          ...overrides,
          value: gasLimit * gasPrice,
        })
      ).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when token transfer cost is unset', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token0, token1, wallet)
      sellRequest.tokenIn = constants.AddressZero
      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_TOKEN_TRANSFER_GAS_COST_UNSET')
    })

    it('fails if the deadline is exceeded', async () => {
      const { delay, token0, token1, wallet, provider } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token0, token1, wallet)
      sellRequest.submitDeadline = BigNumber.from(await provider.getBlockNumber())

      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_EXPIRED')
    })

    it('reverts when amountIn is zero', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token0, token1, wallet)
      sellRequest.amountIn = BigNumber.from(0)

      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_NO_AMOUNT_IN')
    })

    it('reverts when address to is not set', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token0, token1, wallet)
      sellRequest.to = constants.AddressZero

      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_NO_ADDRESS')
    })

    it('reverts when gasLimit is lower than minimum', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token0, token1, wallet)
      sellRequest.gasLimit = 999

      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_GAS_LIMIT_TOO_LOW')
    })

    it('reverts when gasLimit is higher than maximum', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token0, token1, wallet)
      sellRequest.gasLimit = 160001

      await delay.setMaxGasLimit(160000)
      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_GAS_LIMIT_TOO_HIGH')
    })

    it('reverts when pair does not exist', async () => {
      const { delay, token0, token, wallet } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token, token0, wallet)

      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_PAIR_NONEXISTENT')
    })

    it('reverts when no ether was sent', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token0, token1, wallet)

      await delay.setGasPrice(100)
      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when not enough ether was sent', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const sellRequest = getDefaultSell(token0, token1, wallet)

      const gasPrice = 100
      await delay.setGasPrice(gasPrice)
      await expect(
        delay.sell(sellRequest, {
          ...overrides,
          value: sellRequest.gasLimit * gasPrice - 1,
        })
      ).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when deadline is less than 5 min', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const currentTimeUnix = Math.floor(Date.now() / 1000)
      const sellRequest = getDefaultSell(token0, token1, wallet)
      sellRequest.executionDeadline = BigNumber.from(currentTimeUnix)

      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_INVALID_DEADLINE')
    })

    it('reverts when sell is disabled', async () => {
      const { delay, token0, token1, wallet, pair } = await loadFixture(delayFixture)
      await delay.setOrderDisabled(pair.address, OrderType.Sell, true, overrides)
      const sellRequest = getDefaultSell(token0, token1, wallet)
      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_SELL_DISABLED')

      await delay.setOrderDisabled(pair.address, OrderType.Sell, false)
      await expect(delay.sell(sellRequest, overrides)).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })
  })

  it('refunds excess value', async () => {
    const { delay, token, weth, wallet } = await loadFixture(delayFixture)

    const gasPrice = utils.parseUnits('69.420', 'gwei')
    await delay.setGasPrice(gasPrice, overrides)

    await token.approve(delay.address, constants.MaxUint256, overrides)

    const balanceBefore = await wallet.getBalance()

    const sellRequest = getDefaultSell(weth, token, wallet)
    const wethAmount = 1000
    const excess = 1234
    sellRequest.amountIn = BigNumber.from(wethAmount)
    const value = gasPrice.mul(sellRequest.gasLimit).add(wethAmount)
    sellRequest.wrapUnwrap = true

    await delay.sell(sellRequest, {
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
    await delay.setGasPrice(gasPrice, overrides)

    const sellRequest = getDefaultSell(token0, token1, wallet)
    sellRequest.gasPrice = gasPrice

    await token0.approve(delay.address, constants.MaxUint256, overrides)

    const tx = await delay.sell(sellRequest, {
      ...overrides,
      value: gasPrice.mul(sellRequest.gasLimit),
    })
    const { timestamp } = await wallet.provider.getBlock((await tx.wait()).blockHash)

    const newestOrderId = await delay.newestOrderId()
    const { orderType, validAfterTimestamp } = await delay.getOrder(newestOrderId)
    const result = await delay.getSellOrder(newestOrderId)

    expect(orderType).to.equal(OrderType.Sell)
    expect(validAfterTimestamp).to.equal((await delay.delay()).add(timestamp))

    expect([...result]).to.deep.equal([
      pairAddressToPairId(pair.address),
      false,
      sellRequest.amountIn,
      sellRequest.amountOutMin,
      sellRequest.wrapUnwrap,
      sellRequest.to,
      BigNumber.from(sellRequest.gasPrice),
      BigNumber.from(sellRequest.gasLimit),
      constants.MaxUint256,
    ])
  })

  it('enqueues an inverted order', async () => {
    const { delay, token0, token1, wallet, pair } = await loadFixture(delayFixture)
    const sellRequest = getDefaultSell(token1, token0, wallet)
    await delay.setGasPrice(0, overrides)

    await token1.approve(delay.address, constants.MaxUint256, overrides)
    await delay.sell(sellRequest, overrides)

    const result = await delay.getSellOrder(await delay.newestOrderId())
    expect([...result]).to.deep.equal([
      pairAddressToPairId(pair.address),
      true,
      sellRequest.amountIn,
      sellRequest.amountOutMin,
      sellRequest.wrapUnwrap,
      sellRequest.to,
      BigNumber.from(0),
      BigNumber.from(sellRequest.gasLimit),
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

    await sellAndWait(delay, token0, token1, wallet)

    const [reference0, reference1] = await pair.getReferences()
    const [reserve0, reserve1] = await pair.getReserves()
    expect(reference0).to.eq(reserve0)
    expect(reference1).to.eq(reserve1)
  })

  it('returns orderId', async () => {
    const { delay, orderIdTest, token0, token1, wallet } = await loadFixture(delayFixture)
    const gasPrice = await delay.gasPrice()
    const sellRequest = getDefaultSell(token0, token1, wallet)

    await token0.transfer(orderIdTest.address, utils.parseEther('10'), overrides)
    await orderIdTest.approve(token0.address, delay.address, constants.MaxUint256, overrides)

    await expect(
      orderIdTest.sell(sellRequest, {
        ...overrides,
        value: gasPrice.mul(sellRequest.gasLimit),
      })
    )
      .to.emit(orderIdTest, 'OrderId')
      .withArgs(1)
  })
})
