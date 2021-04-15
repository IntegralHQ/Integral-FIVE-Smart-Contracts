import { expect } from 'chai'
import { BigNumber, providers } from 'ethers'
import { EtherHater__factory } from '../../build/types'
import { getOracleParams } from '../../deploy/tasks/params/getOracleParams'
import { delayFixture } from '../shared/fixtures'
import { delayFailingFixture } from '../shared/fixtures/delayFailingFixture'
import { buyAndWait } from '../shared/orders'
import { setupFixtureLoader } from '../shared/setup'
import { encodeErrorData } from '../shared/solidityError'
import {
  expandTo18Decimals,
  getEthRefund,
  getEvents,
  getGasSpent,
  overrides,
  pairAddressToPairId,
} from '../shared/utilities'

describe('IntegralDelay.executeBuy', () => {
  const loadFixture = setupFixtureLoader()

  describe('execution', () => {
    it('removes the order from the queue', async () => {
      const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)

      await addLiquidity(expandTo18Decimals(10), expandTo18Decimals(10))
      await buyAndWait(delay, token0, token1, wallet, {
        gasLimit: 450000,
      })
      await delay.execute(1, overrides)

      expect(await delay.lastProcessedOrderId()).to.equal(1)
    })

    it('token0 for token1', async () => {
      const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(10), expandTo18Decimals(10))

      const balanceBefore = await token1.balanceOf(wallet.address)
      await buyAndWait(delay, token0, token1, wallet, {
        amountInMax: expandTo18Decimals(4),
        amountOut: expandTo18Decimals(1),
        gasLimit: 450000,
      })

      const tx = await delay.execute(1, overrides)
      const balanceAfter = await token1.balanceOf(wallet.address)
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(1))
    })

    it('token1 for token0', async () => {
      const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(10), expandTo18Decimals(10))

      const balanceBefore = await token0.balanceOf(wallet.address)
      await buyAndWait(delay, token1, token0, wallet, {
        amountInMax: expandTo18Decimals(4),
        amountOut: expandTo18Decimals(1),
        gasLimit: 450000,
      })
      const tx = await delay.execute(1, overrides)
      const balanceAfter = await token0.balanceOf(wallet.address)
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(1))
    })

    it('token for weth', async () => {
      const { delay, weth, token, wallet, addLiquidityETH, other } = await loadFixture(delayFixture)
      await addLiquidityETH(expandTo18Decimals(10), expandTo18Decimals(10))

      await buyAndWait(delay, token, weth, wallet, {
        amountInMax: expandTo18Decimals(4),
        amountOut: expandTo18Decimals(1),
        gasLimit: 450000,
        wrapUnwrap: true,
      })
      const balanceBefore = await wallet.getBalance()
      const tx = await delay.connect(other).execute(1, overrides)
      const balanceAfter = await wallet.getBalance()
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      expect(balanceAfter.sub(balanceBefore)).to.be.gt(expandTo18Decimals(1))
    })

    it('weth for token', async () => {
      const { delay, weth, token, wallet, addLiquidityETH, other } = await loadFixture(delayFixture)
      await addLiquidityETH(expandTo18Decimals(10), expandTo18Decimals(10))

      await buyAndWait(delay, weth, token, wallet, {
        etherAmount: expandTo18Decimals(4),
        amountInMax: expandTo18Decimals(4),
        amountOut: expandTo18Decimals(1),
        gasLimit: 450000,
        wrapUnwrap: true,
      })
      const balanceBefore = await token.balanceOf(wallet.address)
      const tx = await delay.connect(other).execute(1, overrides)
      const balanceAfter = await token.balanceOf(wallet.address)
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      expect(balanceAfter.sub(balanceBefore)).to.eq(expandTo18Decimals(1))
    })

    it('calls syncWithOracle on pair', async () => {
      const { delay, token0, token1, wallet, pair, oracle, addLiquidity, buyHelper } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(1000), expandTo18Decimals(1000))

      await oracle.setPrice(expandTo18Decimals(1), overrides)

      await buyAndWait(delay, token0, token1, wallet, {
        amountInMax: await buyHelper.getSwapAmount0In(
          BigNumber.from('100001').mul(BigNumber.from(10).pow(13)).toString(),
          pair.address,
          expandTo18Decimals(1)
        ),
        amountOut: expandTo18Decimals(1),
        gasLimit: 450000,
      })

      const amountIn = expandTo18Decimals(200)
      await token1.transfer(pair.address, amountIn)
      const amountOut = await pair.getSwapAmount0Out(amountIn)
      await pair.swap(amountOut, 0, wallet.address, overrides)

      await oracle.setPrice(expandTo18Decimals(1), overrides)

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
    })

    it('does not modify the order if tokens are transferred to pair', async () => {
      const { delay, token0, token1, pair, other, oracle, addLiquidity } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(1000), expandTo18Decimals(1000))

      await oracle.setPrice(expandTo18Decimals(1), overrides)
      await token0.transfer(other.address, expandTo18Decimals(100), overrides)

      await buyAndWait(delay, token0, token1, other, {
        amountInMax: expandTo18Decimals(1),
        amountOut: expandTo18Decimals(0.9),
        gasLimit: 450000,
      })
      await token0.transfer(pair.address, expandTo18Decimals(100), overrides)

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      const [, reserve1] = await pair.getReserves()
      expect(reserve1.gte(expandTo18Decimals(999))).to.be.true
    })

    it('cannot unwrap WETH', async () => {
      const { delay, weth, token, wallet, other, addLiquidityETH } = await loadFixture(delayFixture)
      await addLiquidityETH(expandTo18Decimals(100), expandTo18Decimals(100))

      const etherHater = await new EtherHater__factory(wallet).deploy(overrides)

      const buyRequest = await buyAndWait(delay, token, weth, etherHater, {
        gasLimit: 490000,
        amountInMax: expandTo18Decimals(5),
        amountOut: expandTo18Decimals(1),
        wrapUnwrap: true,
        gasPrice: 0,
      })

      const wethBalanceBefore = await weth.balanceOf(etherHater.address)
      const balanceBefore = await wallet.provider.getBalance(etherHater.address)
      const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
      const wethBalanceAfter = await weth.balanceOf(etherHater.address)
      const balanceAfter = await wallet.provider.getBalance(etherHater.address)

      const orderExecuted = await getEvents(tx, 'OrderExecuted')
      const [event] = await getEvents(tx, 'UnwrapFailed')
      function getAmount(event: any) {
        return event.args.amount
      }
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(orderExecuted[0]), getEthRefund(orderExecuted[0]))
        .to.emit(delay, 'UnwrapFailed')
        .withArgs(etherHater.address, getAmount(event))

      expect(balanceBefore).to.eq(balanceAfter)
      expect(wethBalanceAfter.sub(wethBalanceBefore)).to.eq(buyRequest.amountOut)
    })
  })

  describe('errors', () => {
    it('insufficient input 0 amount', async () => {
      const { delay, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))

      await buyAndWait(delay, token0, token1, wallet, {
        amountInMax: expandTo18Decimals(1),
        amountOut: expandTo18Decimals(4),
        gasLimit: 450000,
      })
      const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(
          1,
          false,
          encodeErrorData('ID_INSUFFICIENT_INPUT_AMOUNT'),
          getGasSpent(events[0]),
          getEthRefund(events[0])
        )
    })

    it('insufficient input 1 amount', async () => {
      const { delay, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))

      await buyAndWait(delay, token1, token0, wallet, {
        amountInMax: expandTo18Decimals(1),
        amountOut: expandTo18Decimals(4),
        gasLimit: 450000,
      })
      const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(
          1,
          false,
          encodeErrorData('ID_INSUFFICIENT_INPUT_AMOUNT'),
          getGasSpent(events[0]),
          getEthRefund(events[0])
        )
    })

    it('hits the deadline', async () => {
      const { delay, token0, token1, wallet } = await loadFixture(delayFixture)

      const currentTimeUnix = Math.floor(Date.now() / 1000)
      await buyAndWait(delay, token0, token1, wallet, {
        gasLimit: 450000,
        executionDeadline: BigNumber.from(currentTimeUnix + 5 * 60 + 10),
      })
      await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [100])

      const tx = await delay.execute(1, { ...overrides, gasPrice: 0 })
      const events = await getEvents(tx, 'OrderExecuted')

      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, false, encodeErrorData('ID_EXPIRED'), getGasSpent(events[0]), getEthRefund(events[0]))
    })

    it('if token refund fails order is still in queue', async () => {
      const { delay, token0, token1, wallet, addLiquidity, pair } = await loadFixture(delayFailingFixture)

      await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))
      const buy = await buyAndWait(delay, token0, token1, wallet, {
        gasLimit: 450000,
      })

      await token0.setWasteTransferGas(true)
      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, false, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
        .to.emit(delay, 'RefundFailed')
        .withArgs(buy.to, token0.address, buy.amountInMax, encodeErrorData('TH_TRANSFER_FAILED'))

      const orderInQueue = await delay.getBuyOrder(1, overrides)
      const order = [
        pairAddressToPairId(pair.address),
        false,
        buy.amountInMax,
        buy.amountOut,
        buy.wrapUnwrap,
        buy.to,
        buy.gasPrice,
        BigNumber.from(buy.gasLimit),
        buy.executionDeadline,
      ]
      expect(order).to.deep.eq(orderInQueue)
      expect(await delay.lastProcessedOrderId()).to.eq(1)
      expect(await delay.newestOrderId()).to.eq(1)
    })

    it('if ether refund fails order is still in queue', async () => {
      const { delay, token, weth, wallet, addLiquidityETH, wethPair } = await loadFixture(delayFixture)
      await addLiquidityETH(expandTo18Decimals(100), expandTo18Decimals(100))
      const etherHater = await new EtherHater__factory(wallet).deploy(overrides)

      const buy = await buyAndWait(delay, weth, token, wallet, {
        to: etherHater.address,
        etherAmount: expandTo18Decimals(4),
        amountInMax: expandTo18Decimals(4),
        amountOut: expandTo18Decimals(1),
        gasLimit: 350000,
        wrapUnwrap: true,
      })

      const tx = await delay.execute(1, overrides)
      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, false, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
        .to.emit(delay, 'RefundFailed')
        .withArgs(buy.to, weth.address, buy.amountInMax, encodeErrorData('EtherHater: NOPE_SORRY'))

      const orderInQueue = await delay.getBuyOrder(1, overrides)
      const order = [
        pairAddressToPairId(wethPair.address),
        BigNumber.from(weth.address).gt(BigNumber.from(token.address)),
        buy.amountInMax,
        buy.amountOut,
        buy.wrapUnwrap,
        buy.to,
        buy.gasPrice,
        BigNumber.from(buy.gasLimit),
        buy.executionDeadline,
      ]
      expect(order).to.deep.eq(orderInQueue)
      expect(await delay.lastProcessedOrderId()).to.eq(1)
      expect(await delay.newestOrderId()).to.eq(1)
    })
  })

  describe('refund', () => {
    it('eth to bot', async () => {
      const { delay, token0, token1, wallet, other, addLiquidity, orders } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(10), expandTo18Decimals(10))

      const buyRequest = await buyAndWait(delay, token0, token1, wallet, {
        amountInMax: expandTo18Decimals(4),
        amountOut: expandTo18Decimals(1),
        gasLimit: 450000,
      })
      const botBalanceBefore = await other.getBalance()
      const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
      const botBalanceAfter = await other.getBalance()
      const botRefund = botBalanceAfter.sub(botBalanceBefore)
      const tokenTransferCost = 60_000
      const minRefund = (await orders.ORDER_BASE_COST()).add(tokenTransferCost).mul(buyRequest.gasPrice)
      const maxRefund = BigNumber.from(buyRequest.gasLimit).mul(buyRequest.gasPrice)

      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
        .to.emit(delay, 'EthRefund')
        .withArgs(other.address, true, botRefund)
      expect(botRefund).not.to.be.below(minRefund)
      expect(botRefund).not.to.be.above(maxRefund)
    })

    it('eth to user', async () => {
      const { delay, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(10), expandTo18Decimals(10))

      await buyAndWait(delay, token0, token1, wallet, {
        amountInMax: expandTo18Decimals(4),
        amountOut: expandTo18Decimals(1),
        gasLimit: 450000,
      })
      const userBalanceBefore = await wallet.getBalance()
      const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
      const userBalanceAfter = await wallet.getBalance()
      const userRefund = userBalanceAfter.sub(userBalanceBefore)

      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(1, true, '0x', getGasSpent(events[0]), userRefund)
        .to.emit(delay, 'EthRefund')
        .withArgs(wallet.address, true, userRefund)
    })

    it('token0', async () => {
      const { delay, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))

      const balanceBefore = await token0.balanceOf(wallet.address)
      const buyRequest = await buyAndWait(delay, token0, token1, wallet, {
        amountInMax: expandTo18Decimals(1),
        amountOut: expandTo18Decimals(4),
        gasLimit: 450000,
      })
      const balanceBetween = await token0.balanceOf(wallet.address)
      const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
      const balanceAfter = await token0.balanceOf(wallet.address)

      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(
          1,
          false,
          encodeErrorData('ID_INSUFFICIENT_INPUT_AMOUNT'),
          getGasSpent(events[0]),
          getEthRefund(events[0])
        )
      expect(balanceBefore.sub(balanceBetween)).to.eq(buyRequest.amountInMax)
      expect(balanceAfter.sub(balanceBefore)).to.eq(0)
    })

    it('token1', async () => {
      const { delay, token0, token1, wallet, other, addLiquidity } = await loadFixture(delayFixture)
      await addLiquidity(expandTo18Decimals(100), expandTo18Decimals(100))

      const balanceBefore = await token1.balanceOf(wallet.address)
      const buyRequest = await buyAndWait(delay, token1, token0, wallet, {
        amountInMax: expandTo18Decimals(1),
        amountOut: expandTo18Decimals(4),
        gasLimit: 450000,
      })
      const balanceBetween = await token1.balanceOf(wallet.address)
      const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
      const balanceAfter = await token1.balanceOf(wallet.address)

      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(
          1,
          false,
          encodeErrorData('ID_INSUFFICIENT_INPUT_AMOUNT'),
          getGasSpent(events[0]),
          getEthRefund(events[0])
        )
      expect(balanceBefore.sub(balanceBetween)).to.eq(buyRequest.amountInMax)
      expect(balanceAfter.sub(balanceBefore)).to.eq(0)
    })

    it('weth', async () => {
      const { delay, weth, token, wallet, other, addLiquidityETH } = await loadFixture(delayFixture)
      await addLiquidityETH(expandTo18Decimals(100), expandTo18Decimals(100))

      const balanceBefore = await wallet.getBalance()
      const buyRequest = await buyAndWait(delay, weth, token, wallet, {
        etherAmount: expandTo18Decimals(1),
        amountInMax: expandTo18Decimals(1),
        amountOut: expandTo18Decimals(4),
        wrapUnwrap: true,
        gasLimit: 450000,
        gasPrice: BigNumber.from(0),
      })
      const balanceBetween = await wallet.getBalance()
      const tx = await delay.connect(other).execute(1, { ...overrides, gasPrice: 0 })
      const balanceAfter = await wallet.getBalance()

      const events = await getEvents(tx, 'OrderExecuted')
      await expect(Promise.resolve(tx))
        .to.emit(delay, 'OrderExecuted')
        .withArgs(
          1,
          false,
          encodeErrorData('ID_INSUFFICIENT_INPUT_AMOUNT'),
          getGasSpent(events[0]),
          getEthRefund(events[0])
        )
      expect(balanceBefore.sub(balanceBetween)).to.be.above(buyRequest.amountInMax)
      expect(balanceAfter.sub(balanceBetween)).to.eq(expandTo18Decimals(1))
    })
  })

  it('eth-dai specific case', async () => {
    const { delay, oracle, token0: dai, token1: eth, wallet, other, addLiquidity } = await loadFixture(delayFixture)

    const amountOut = BigNumber.from('1000000000000000000000') // DAI
    const amountInMax = BigNumber.from('557525855877975842') // ETH
    const reserve0 = BigNumber.from('44547107558096886868242274') // DAI
    const reserve1 = BigNumber.from('27685936267870034790868') // ETH
    const price = BigNumber.from('545609375715524')

    await oracle.setParameters(...getOracleParams('weth-dai', 'DAI'))
    await oracle.setPrice(price)
    await addLiquidity(reserve0, reserve1)

    // tokenIn: eth
    // tokenOut: dai
    await buyAndWait(delay, eth, dai, wallet, {
      amountInMax,
      amountOut,
      gasLimit: 420000,
    })

    const tx = await delay.connect(other).execute(1)

    const events = await getEvents(tx, 'OrderExecuted')
    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
  })
})
