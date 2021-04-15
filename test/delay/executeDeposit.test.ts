import { expect } from 'chai'
import { BigNumber, providers, utils } from 'ethers'
import { EtherHater__factory } from '../../build/types'
import { depositAndWait } from '../shared/orders'
import { delayFixture } from '../shared/fixtures'
import { delayFailingFixture } from '../shared/fixtures/delayFailingFixture'
import { setupFixtureLoader } from '../shared/setup'
import { encodeErrorData } from '../shared/solidityError'
import {
  expandTo18Decimals,
  expandToDecimals,
  getEthRefund,
  getEvents,
  getGasSpent,
  makeFloatEncodable,
  overrides,
  pairAddressToPairId,
} from '../shared/utilities'

describe('IntegralDelay.executeDeposit', () => {
  const loadFixture = setupFixtureLoader()

  describe('success', () => {
    it('mints initial liquidity', async () => {
      const { delay, token0, token1, wallet, pair, MINIMUM_LIQUIDITY, MINT_FEE, PRECISION } = await loadFixture(
        delayFixture
      )

      const balanceBefore = await pair.balanceOf(wallet.address)
      const token0BalanceBefore = await token0.balanceOf(wallet.address)
      const token1BalanceBefore = await token1.balanceOf(wallet.address)

      const depositRequest = await depositAndWait(delay, token0, token1, wallet)

      const expectedLiquidity = depositRequest.amount0
      const expectedFee = expectedLiquidity.sub(MINIMUM_LIQUIDITY).mul(MINT_FEE).div(PRECISION)

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

      const balanceAfter = await pair.balanceOf(wallet.address)
      const token0BalanceAfter = await token0.balanceOf(wallet.address)
      const token1BalanceAfter = await token1.balanceOf(wallet.address)

      expect(balanceAfter.sub(balanceBefore)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY).sub(expectedFee))
      expect(token0BalanceBefore.sub(token0BalanceAfter)).to.eq(depositRequest.amount0)
      expect(token1BalanceBefore.sub(token1BalanceAfter)).to.eq(depositRequest.amount1)
    })

    const cases = [
      // equal reserves
      { reserve0: 100, reserve1: 100, amount0: 10, amount1: 40 },
      { reserve0: 100, reserve1: 100, amount0: 40, amount1: 10 },
      { reserve0: 100, reserve1: 100, amount0: 40, amount1: 40 },
      { reserve0: 100, reserve1: 100, amount0: 0, amount1: 40 },
      { reserve0: 100, reserve1: 100, amount0: 40, amount1: 0 },

      // reserve 0 is bigger
      { reserve0: 200, reserve1: 100, amount0: 10, amount1: 40 },
      { reserve0: 200, reserve1: 100, amount0: 40, amount1: 10 },
      { reserve0: 200, reserve1: 100, amount0: 40, amount1: 40 },
      { reserve0: 200, reserve1: 100, amount0: 0, amount1: 40 },
      { reserve0: 200, reserve1: 100, amount0: 40, amount1: 0 },

      // reserve 1 is bigger
      { reserve0: 100, reserve1: 200, amount0: 10, amount1: 40 },
      { reserve0: 100, reserve1: 200, amount0: 40, amount1: 10 },
      { reserve0: 100, reserve1: 200, amount0: 40, amount1: 40 },
      { reserve0: 100, reserve1: 200, amount0: 0, amount1: 40 },
      { reserve0: 100, reserve1: 200, amount0: 40, amount1: 0 },

      // one reserve is very small
      { reserve0: 0.00001, reserve1: 200, amount0: 40, amount1: 40 },
      { reserve0: 0.00001, reserve1: 200, amount0: 40, amount1: 0 },
      { reserve0: 0.00001, reserve1: 200, amount0: 0, amount1: 40 },

      // extremes
      { reserve0: 1, reserve1: 2, amount0: 5000, amount1: 0, clearFees: true },
      { reserve0: 1, reserve1: 2, amount0: 0, amount1: 5000, clearFees: true },
      { reserve0: 2, reserve1: 1, amount0: 5000, amount1: 0, clearFees: true },
      { reserve0: 2, reserve1: 1, amount0: 0, amount1: 5000, clearFees: true },
    ]

    for (const { reserve0, reserve1, amount0, amount1, clearFees } of cases) {
      it(`reserves: (${reserve0}, ${reserve1}) + amounts: (${amount0}, ${amount1})`, async () => {
        const { delay, token0, token1, wallet, factory, pair, addLiquidity } = await loadFixture(delayFixture)

        if (clearFees) {
          await factory.setMintFee(token0.address, token1.address, 0, overrides)
          await factory.setSwapFee(token0.address, token1.address, 0, overrides)
        }

        await addLiquidity(expandTo18Decimals(reserve0), expandTo18Decimals(reserve1))
        await depositAndWait(delay, token0, token1, wallet, {
          amount0: expandTo18Decimals(amount0),
          amount1: expandTo18Decimals(amount1),
          gasLimit: 700_000,
        })

        const price = 2
        const initialLiquidity = Math.sqrt(reserve0 * reserve1)
        const expectedLiquidityNumber = initialLiquidity * ((amount0 * price + amount1) / (reserve0 * price + reserve1))
        const expectedLiquidity = expandTo18Decimals(expectedLiquidityNumber)

        const liquidityBefore = await pair.balanceOf(wallet.address)
        const balance0Before = await token0.balanceOf(wallet.address)
        const balance1Before = await token1.balanceOf(wallet.address)

        const tx = await delay.execute(1, overrides)
        const events = await getEvents(tx, 'OrderExecuted')
        await expect(Promise.resolve(tx))
          .to.emit(delay, 'OrderExecuted')
          .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

        const liquidityAfter = await pair.balanceOf(wallet.address)
        const balance0After = await token0.balanceOf(wallet.address)
        const balance1After = await token1.balanceOf(wallet.address)

        // between 99% and 101% of expected liquidity
        const liquidity = liquidityAfter.sub(liquidityBefore)
        const expected99Percent = expectedLiquidity.mul(99).div(100)
        const expected101Percent = expectedLiquidity.mul(101).div(100)
        expect(liquidity.gte(expected99Percent), 'too little liquidity').to.be.true
        expect(liquidity.lte(expected101Percent), 'too much liquidity').to.be.true
        // one small refund
        const token0Refund = balance0After.sub(balance0Before)
        const token1Refund = balance1After.sub(balance1Before)
        expect(token0Refund.isZero() || token1Refund.isZero(), 'at least one refund is non-zero').to.be.true
        expect(token0Refund.lt(expandTo18Decimals(0.01 * amount0 || 1)), 'refund 0 too large').to.be.true
        expect(token1Refund.lt(expandTo18Decimals(0.01 * amount1 || 1)), 'refund 1 too large').to.be.true
      })
    }

    it('does not swap when minRatioChangeToSwap is not exceeded', async () => {
      const { delay, token0, token1, wallet, factory, pair, addLiquidity } = await loadFixture(delayFixture)

      await factory.setMintFee(token0.address, token1.address, 0, overrides)

      await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(100))
      await depositAndWait(delay, token0, token1, wallet, {
        amount0: expandTo18Decimals(300),
        amount1: expandTo18Decimals(100),
        initialRatio: expandTo18Decimals(2),
        minRatioChangeToSwap: 500,
      })

      const balance0Before = await token0.balanceOf(wallet.address)
      const balance1Before = await token1.balanceOf(wallet.address)

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

      const balance0After = await token0.balanceOf(wallet.address)
      const balance1After = await token1.balanceOf(wallet.address)

      const [reserve0, reserve1] = await pair.getReserves()
      expect(reserve0).to.eq(expandTo18Decimals(400))
      expect(reserve1).to.eq(expandTo18Decimals(200))

      expect(balance0After.sub(balance0Before)).to.eq(expandTo18Decimals(100))
      expect(balance1After.sub(balance1Before)).to.eq(expandTo18Decimals(0))
    })

    it('does swap when minRatioChangeToSwap is exceeded', async () => {
      const { delay, token0, token1, wallet, factory, pair, addLiquidity } = await loadFixture(delayFixture)

      await factory.setMintFee(token0.address, token1.address, 0, overrides)
      await factory.setSwapFee(token0.address, token1.address, 0, overrides)

      await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(100))
      await depositAndWait(delay, token0, token1, wallet, {
        amount0: expandTo18Decimals(300),
        amount1: expandTo18Decimals(100),
        initialRatio: expandTo18Decimals(2),
        minRatioChangeToSwap: 500,
      })
      await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(300))

      const balance0Before = await token0.balanceOf(wallet.address)
      const balance1Before = await token1.balanceOf(wallet.address)

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

      const balance0After = await token0.balanceOf(wallet.address)
      const balance1After = await token1.balanceOf(wallet.address)

      const [reserve0, reserve1] = await pair.getReserves()

      const expectBetween = (a: BigNumber, min: number, max: number) => {
        expect(a.gte(expandTo18Decimals(min)), 'Value too small').to.be.true
        expect(a.lte(expandTo18Decimals(max)), 'Value too large').to.be.true
      }

      expectBetween(reserve0, 500, 501)
      expectBetween(reserve1, 499, 500)
      expectBetween(balance0After.sub(balance0Before), 0, 1)
      expectBetween(balance1After.sub(balance1Before), 0, 1)
    })

    it('respects minRatioChangeToSwap for tokens denominated in other bases than 1e18', async () => {
      const { delay, token0, token1, wallet, factory, pair, addLiquidity } = await loadFixture(delayFixture)

      await factory.setMintFee(token0.address, token1.address, 0, overrides)
      await factory.setSwapFee(token0.address, token1.address, 0, overrides)

      await addLiquidity(expandToDecimals(200, 6), expandToDecimals(100, 20))
      await depositAndWait(delay, token0, token1, wallet, {
        amount0: expandToDecimals(200, 6),
        amount1: expandToDecimals(100, 20),
        // initial ratio is automatically calculated
        minRatioChangeToSwap: 500,
      })
      await addLiquidity(expandToDecimals(1, 6), expandToDecimals(300, 20))

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

      const [reserve0, reserve1] = await pair.getReserves()

      const expectBetween = (a: BigNumber, min: number, max: number, decimals = 18) => {
        expect(a.gte(expandToDecimals(min, decimals)), 'Value too small').to.be.true
        expect(a.lte(expandToDecimals(max, decimals)), 'Value too large').to.be.true
      }

      expectBetween(reserve0, 400, 401, 6)
      expectBetween(reserve1, 499, 500, 20)
    })

    it('does not modify the order if tokens are transferred to pair', async () => {
      const { delay, token0, token1, other, pair, addLiquidity } = await loadFixture(delayFixture)

      await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(100))
      await depositAndWait(delay, token0, token1, other, {
        amount0: expandTo18Decimals(2),
        amount1: expandTo18Decimals(1),
      })
      await token0.transfer(pair.address, expandTo18Decimals(2000), overrides)
      await token1.transfer(pair.address, expandTo18Decimals(1000), overrides)

      expect(await pair.balanceOf(other.address)).to.equal(0)

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

      const liquidity = await pair.balanceOf(other.address)
      expect(liquidity.lte(expandTo18Decimals(1))).to.be.true
    })

    it('price higher than minSwapPrice', async () => {
      const { delay, token0, token1, other, oracle, addLiquidity } = await loadFixture(delayFixture)

      await oracle.setPrice(expandTo18Decimals(10))
      await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(200))
      await depositAndWait(delay, token0, token1, other, {
        amount0: expandTo18Decimals(2),
        amount1: expandTo18Decimals(1),
        minSwapPrice: makeFloatEncodable(expandTo18Decimals(5)),
      })

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
    })

    it('price lower than maxSwapPrice', async () => {
      const { delay, token0, token1, other, oracle, addLiquidity } = await loadFixture(delayFixture)

      await oracle.setPrice(expandTo18Decimals(10))
      await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(200))
      await depositAndWait(delay, token0, token1, other, {
        amount0: expandTo18Decimals(1),
        amount1: expandTo18Decimals(2),
        maxSwapPrice: makeFloatEncodable(expandTo18Decimals(20)),
      })

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
    })
  })

  it('refunds tokens if gasLimit was not enough for execution', async () => {
    const { delay, token0, token1, wallet, pair, addLiquidity } = await loadFixture(delayFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))

    const liquidityBefore = await pair.balanceOf(wallet.address)
    const token0BalanceBefore = await token0.balanceOf(wallet.address)
    const token1BalanceBefore = await token1.balanceOf(wallet.address)

    await depositAndWait(delay, token0, token1, wallet, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(1),
      gasLimit: 200000,
    })

    const tx = await delay.execute(1, overrides)
    const events = await getEvents(tx, 'OrderExecuted')
    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

    const liquidityAfter = await pair.balanceOf(wallet.address)
    const token0BalanceAfter = await token0.balanceOf(wallet.address)
    const token1BalanceAfter = await token1.balanceOf(wallet.address)

    expect(token0BalanceBefore.sub(token0BalanceAfter)).to.eq(0)
    expect(token1BalanceBefore.sub(token1BalanceAfter)).to.eq(0)
    expect(liquidityAfter.sub(liquidityBefore)).to.eq(0)
  })

  it('refunds ether to the bot and the user', async () => {
    const { delay, token0, token1, wallet, other, addLiquidity, orders } = await loadFixture(delayFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const depositRequest = await depositAndWait(delay, token0, token1, wallet, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(1),
    })

    const botBalanceBefore = await other.getBalance()
    const userBalanceBefore = await wallet.getBalance()

    const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
    const events = await getEvents(tx, 'OrderExecuted')

    const botBalanceAfter = await other.getBalance()
    const userBalanceAfter = await wallet.getBalance()

    const botRefund = botBalanceAfter.sub(botBalanceBefore)
    const userRefund = userBalanceAfter.sub(userBalanceBefore)

    const tokenTransferCost = 60_000
    const minRefund = (await orders.ORDER_BASE_COST()).add(2 * tokenTransferCost).mul(depositRequest.gasPrice)
    const maxRefund = BigNumber.from(depositRequest.gasLimit).mul(depositRequest.gasPrice)
    expect(botRefund).not.to.be.below(minRefund)
    expect(botRefund).not.to.be.above(maxRefund)

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'EthRefund')
      .withArgs(other.address, true, botRefund)
      .to.emit(delay, 'EthRefund')
      .withArgs(wallet.address, true, userRefund)
  })

  it('succeeds even if user eth refund fails', async () => {
    const { delay, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
    const etherHater = await new EtherHater__factory(wallet).deploy(overrides)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    await depositAndWait(delay, token0, token1, etherHater, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(1),
    })

    const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
    const events = await getEvents(tx, 'OrderExecuted')
    const ethRefunds = await getEvents(tx, 'EthRefund')
    const [botRefundEvent, userRefundEvent] = ethRefunds

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'EthRefund')
      .withArgs(other.address, true, botRefundEvent.args?.[2])
      .to.emit(delay, 'EthRefund')
      .withArgs(etherHater.address, false, userRefundEvent.args?.[2])
  })

  it('will not waste to much gas', async () => {
    const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFailingFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const deposit = await depositAndWait(delay, token0, token1, wallet, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(1),
    })

    await token0.setWasteTransferGas(true)
    const tx = await delay.execute(1, overrides)
    const events = await getEvents(tx, 'OrderExecuted')
    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, encodeErrorData('TH_TRANSFER_FAILED'), getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'RefundFailed')
      .withArgs(wallet.address, token0.address, deposit.amount0, encodeErrorData('TH_TRANSFER_FAILED'))
  })

  it('hits the deadline', async () => {
    const { delay, token0, token1, wallet } = await loadFixture(delayFixture)

    const currentTimeUnix = Math.floor(Date.now() / 1000)
    await depositAndWait(delay, token0, token1, wallet, {
      executionDeadline: BigNumber.from(currentTimeUnix + 5 * 60 + 10),
    })
    await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [100])

    const tx = await delay.execute(1, { ...overrides, gasPrice: 0 })
    const events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, encodeErrorData('ID_EXPIRED'), getGasSpent(events[0]), getEthRefund(events[0]))
  })

  it('deposit for tokens with greater cost requires more gasLimit', async () => {
    const { delay, token0, token1, wallet } = await loadFixture(delayFixture)
    await delay.setTransferGasCost(token0.address, 200_000)
    await delay.setTransferGasCost(token1.address, 200_000)

    await depositAndWait(delay, token0, token1, wallet)
    const failingTx = await delay.execute(1, { ...overrides, gasPrice: 0 })
    let events = await getEvents(failingTx, 'OrderExecuted')

    await expect(Promise.resolve(failingTx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

    await depositAndWait(delay, token0, token1, wallet, {
      gasLimit: 1_000_000,
    })
    const passingTx = await delay.execute(1, { ...overrides, gasPrice: 0 })
    events = await getEvents(passingTx, 'OrderExecuted')

    await expect(Promise.resolve(passingTx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(2, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
  })

  it('fails on price lower than minSwapPrice', async () => {
    const { delay, token0, token1, other, oracle, addLiquidity } = await loadFixture(delayFixture)

    await oracle.setPrice(expandTo18Decimals(10))
    await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(200))
    await depositAndWait(delay, token0, token1, other, {
      amount0: expandTo18Decimals(2),
      amount1: expandTo18Decimals(1),
      minSwapPrice: makeFloatEncodable(expandTo18Decimals(20)),
    })

    const tx = await delay.execute(1, overrides)
    const events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, encodeErrorData('AL_PRICE_TOO_LOW'), getGasSpent(events[0]), getEthRefund(events[0]))
  })

  it('fails on price higher than maxSwapPrice', async () => {
    const { delay, token0, token1, other, oracle, addLiquidity } = await loadFixture(delayFixture)

    await oracle.setPrice(expandTo18Decimals(10))
    await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(200))
    await depositAndWait(delay, token0, token1, other, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(2),
      maxSwapPrice: makeFloatEncodable(expandTo18Decimals(5)),
    })

    const tx = await delay.execute(1, overrides)
    const events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, encodeErrorData('AL_PRICE_TOO_HIGH'), getGasSpent(events[0]), getEthRefund(events[0]))
  })

  it('token1 refund fails if token0 refund fails', async () => {
    const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFailingFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const deposit = await depositAndWait(delay, token0, token1, wallet, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(1),
    })

    await token0.setWasteTransferGas(true)
    const tx = await delay.execute(1, overrides)
    const events = await getEvents(tx, 'OrderExecuted')
    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, encodeErrorData('TH_TRANSFER_FAILED'), getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'RefundFailed')
      .withArgs(wallet.address, token0.address, deposit.amount0, encodeErrorData('TH_TRANSFER_FAILED'))
      .to.emit(delay, 'RefundFailed')
      .withArgs(wallet.address, token1.address, deposit.amount1, encodeErrorData('TH_TRANSFER_FAILED'))
  })

  it('token0 refund fails if token1 refund fails', async () => {
    const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFailingFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const deposit = await depositAndWait(delay, token0, token1, wallet, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(1),
    })

    await token1.setWasteTransferGas(true)
    const tx = await delay.execute(1, overrides)
    const events = await getEvents(tx, 'OrderExecuted')
    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, encodeErrorData('TH_TRANSFER_FAILED'), getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'RefundFailed')
      .withArgs(wallet.address, token0.address, deposit.amount0, encodeErrorData('TH_TRANSFER_FAILED'))
      .to.emit(delay, 'RefundFailed')
      .withArgs(wallet.address, token1.address, deposit.amount1, encodeErrorData('TH_TRANSFER_FAILED'))
  })

  it('if token refund fails order is still in queue', async () => {
    const { delay, token0, token1, wallet, addLiquidity, pair } = await loadFixture(delayFailingFixture)

    await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
    const deposit = await depositAndWait(delay, token0, token1, wallet, {
      amount0: expandTo18Decimals(1),
      amount1: expandTo18Decimals(1),
    })

    await token0.setWasteTransferGas(true)
    const tx = await delay.execute(1, overrides)
    const events = await getEvents(tx, 'OrderExecuted')
    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, encodeErrorData('TH_TRANSFER_FAILED'), getGasSpent(events[0]), getEthRefund(events[0]))

    const orderInQueue = await delay.getDepositOrder(1, overrides)
    const order = [
      pairAddressToPairId(pair.address),
      deposit.amount0,
      deposit.amount1,
      deposit.initialRatio,
      BigNumber.from(deposit.minRatioChangeToSwap),
      deposit.minSwapPrice,
      deposit.maxSwapPrice,
      deposit.wrap,
      deposit.to,
      deposit.gasPrice,
      BigNumber.from(deposit.gasLimit),
      deposit.executionDeadline,
    ]
    expect(order).to.deep.eq(orderInQueue)
    expect(await delay.lastProcessedOrderId()).to.eq(1)
    expect(await delay.newestOrderId()).to.eq(1)
  })

  it('if ether refund fails order is still in queue', async () => {
    const { delay, token, wallet, weth, wethPair } = await loadFixture(delayFixture)
    const etherHater = await new EtherHater__factory(wallet).deploy(overrides)
    const deposit = await depositAndWait(delay, token, weth, wallet, {
      to: etherHater.address,
      wrap: true,
      gasLimit: 350000,
      etherAmount: utils.parseEther('2'),
    })

    const tx = await delay.execute(1, overrides)
    const events = await getEvents(tx, 'OrderExecuted')
    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, false, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'RefundFailed')
      .withArgs(etherHater.address, weth.address, utils.parseEther('2'), encodeErrorData('EtherHater: NOPE_SORRY'))
      .to.emit(delay, 'RefundFailed')
      .withArgs(etherHater.address, token.address, utils.parseEther('2'), encodeErrorData('EtherHater: NOPE_SORRY'))

    const orderInQueue = await delay.getDepositOrder(1, overrides)
    const order = [
      pairAddressToPairId(wethPair.address),
      deposit.amount0,
      deposit.amount1,
      deposit.initialRatio,
      BigNumber.from(deposit.minRatioChangeToSwap),
      deposit.minSwapPrice,
      deposit.maxSwapPrice,
      deposit.wrap,
      deposit.to,
      deposit.gasPrice,
      BigNumber.from(deposit.gasLimit),
      deposit.executionDeadline,
    ]
    expect(order).to.deep.eq(orderInQueue)
    expect(await delay.lastProcessedOrderId()).to.eq(1)
    expect(await delay.newestOrderId()).to.eq(1)
  })
})
