import { expect } from 'chai'
import { constants, BigNumber, utils } from 'ethers'
import { delayFixture } from '../shared/fixtures'
import { getDefaultBuy, buyAndWait } from '../shared/orders'
import { OrderType } from '../shared/OrderType'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, overrides, pairAddressToPairId } from '../shared/utilities'

describe('IntegralDelay.buy', () => {
  const loadFixture = setupFixtureLoader()

  describe('checks', () => {
    it('accounts for weth being used', async () => {
      const { delay, token, weth, wallet } = await loadFixture(delayFixture)

      const gasLimit = 10000
      const gasPrice = 100
      await delay.setGasPrice(gasPrice)

      const buyRequest = getDefaultBuy(weth, token, wallet)
      buyRequest.amountInMax = BigNumber.from(100)
      buyRequest.wrapUnwrap = true

      await expect(
        delay.buy(buyRequest, {
          ...overrides,
          value: gasLimit * gasPrice,
        })
      ).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when token transfer cost is unset', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token0, token1, wallet)
      buyRequest.tokenIn = constants.AddressZero
      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_TOKEN_TRANSFER_GAS_COST_UNSET')
    })

    it('fails if the deadline is exceeded', async () => {
      const { delay, token0, token1, wallet, provider } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token0, token1, wallet)
      buyRequest.submitDeadline = BigNumber.from(await provider.getBlockNumber())

      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_EXPIRED')
    })

    it('reverts when amountOut is zero', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token0, token1, wallet)
      buyRequest.amountOut = BigNumber.from(0)

      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_NO_AMOUNT_OUT')
    })

    it('reverts when address to is not set', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token0, token1, wallet)
      buyRequest.to = constants.AddressZero

      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_NO_ADDRESS')
    })

    it('reverts when gasLimit is lower than minimum', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token0, token1, wallet)
      buyRequest.gasLimit = 999

      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_GAS_LIMIT_TOO_LOW')
    })

    it('reverts when gasLimit is higher than maximum', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token0, token1, wallet)
      buyRequest.gasLimit = 160001

      await delay.setMaxGasLimit(160000)
      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_GAS_LIMIT_TOO_HIGH')
    })

    it('reverts when pair does not exist', async () => {
      const { delay, token0, token, wallet } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token, token0, wallet)

      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_PAIR_NONEXISTENT')
    })

    it('reverts when no ether was sent', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token0, token1, wallet)

      await delay.setGasPrice(100)
      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when not enough ether was sent', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const buyRequest = getDefaultBuy(token0, token1, wallet)

      const gasPrice = 100
      await delay.setGasPrice(gasPrice)
      await expect(
        delay.buy(buyRequest, {
          ...overrides,
          value: buyRequest.gasLimit * gasPrice - 1,
        })
      ).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })

    it('reverts when deadline is less than 5 min', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
      const currentTimeUnix = Math.floor(Date.now() / 1000)
      const buyRequest = getDefaultBuy(token0, token1, wallet)
      buyRequest.executionDeadline = BigNumber.from(currentTimeUnix)

      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_INVALID_DEADLINE')
    })

    it('reverts when buy is disabled', async () => {
      const { delay, token0, token1, wallet, pair } = await loadFixture(delayFixture)
      await delay.setOrderDisabled(pair.address, OrderType.Buy, true)
      const buyRequest = getDefaultBuy(token0, token1, wallet)
      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_BUY_DISABLED')

      await delay.setOrderDisabled(pair.address, OrderType.Buy, false)
      await expect(delay.buy(buyRequest, overrides)).to.revertedWith('OS_NOT_ENOUGH_FUNDS')
    })
  })

  it('refunds excess value', async () => {
    const { delay, token, weth, wallet } = await loadFixture(delayFixture)

    const gasPrice = utils.parseUnits('69.420', 'gwei')
    await delay.setGasPrice(gasPrice)

    await token.approve(delay.address, constants.MaxUint256, overrides)

    const balanceBefore = await wallet.getBalance()

    const buyRequest = getDefaultBuy(weth, token, wallet)
    const wethAmount = 1000
    const excess = 1234
    buyRequest.amountInMax = BigNumber.from(wethAmount)
    const value = gasPrice.mul(buyRequest.gasLimit).add(wethAmount)
    buyRequest.wrapUnwrap = true

    await delay.buy(buyRequest, {
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
    const gasPrice = await delay.gasPrice()
    const buyRequest = getDefaultBuy(token0, token1, wallet)

    await token0.approve(delay.address, constants.MaxUint256, overrides)
    const tx = await delay.buy(buyRequest, {
      ...overrides,
      value: gasPrice.mul(buyRequest.gasLimit),
    })

    const { timestamp } = await wallet.provider.getBlock((await tx.wait()).blockHash)
    const newestOrderId = await delay.newestOrderId()
    const { orderType, validAfterTimestamp } = await delay.getOrder(newestOrderId)
    const result = await delay.getBuyOrder(newestOrderId)

    expect(orderType).to.equal(OrderType.Buy)
    expect(validAfterTimestamp).to.equal((await delay.delay()).add(timestamp))
    expect([...result]).to.deep.equal([
      pairAddressToPairId(pair.address),
      false,
      buyRequest.amountInMax,
      buyRequest.amountOut,
      buyRequest.wrapUnwrap,
      buyRequest.to,
      gasPrice,
      BigNumber.from(buyRequest.gasLimit),
      constants.MaxUint256,
    ])
  })

  it('enqueues an inverted order', async () => {
    const { delay, token0, token1, wallet, pair } = await loadFixture(delayFixture)
    await delay.setGasPrice(0)
    const buyRequest = getDefaultBuy(token1, token0, wallet)

    await token1.approve(delay.address, constants.MaxUint256, overrides)
    await delay.buy(buyRequest, overrides)

    const result = await delay.getBuyOrder(await delay.newestOrderId())
    expect([...result]).to.deep.equal([
      pairAddressToPairId(pair.address),
      true,
      buyRequest.amountInMax,
      buyRequest.amountOut,
      buyRequest.wrapUnwrap,
      buyRequest.to,
      BigNumber.from(0),
      BigNumber.from(buyRequest.gasLimit),
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

    await buyAndWait(delay, token0, token1, wallet)

    const [reference0, reference1] = await pair.getReferences()
    const [reserve0, reserve1] = await pair.getReserves()
    expect(reference0).to.eq(reserve0)
    expect(reference1).to.eq(reserve1)
  })

  it('returns orderId', async () => {
    const { delay, orderIdTest, token0, token1, wallet } = await loadFixture(delayFixture)
    const gasPrice = await delay.gasPrice()
    const buyRequest = getDefaultBuy(token0, token1, wallet)

    await token0.transfer(orderIdTest.address, utils.parseEther('10'))
    await orderIdTest.approve(token0.address, delay.address, constants.MaxUint256, overrides)

    await expect(
      orderIdTest.buy(buyRequest, {
        ...overrides,
        value: gasPrice.mul(buyRequest.gasLimit),
      })
    )
      .to.emit(orderIdTest, 'OrderId')
      .withArgs(1)
  })
})
