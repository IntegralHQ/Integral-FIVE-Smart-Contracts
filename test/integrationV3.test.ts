import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { IERC20, IntegralPair } from '../build/types'
import { integralAndUniswapV3Fixture } from './shared/fixtures/integralAndUniswapV3Fixture'
import { buyAndWait, depositAndWait, sellAndWait, withdrawAndWait } from './shared/orders'
import { setupFixtureLoader } from './shared/setup'
import { FeeAmount } from './shared/uniswapV3Utilities'
import {
  expandTo18Decimals,
  expandToDecimals,
  getEthRefund,
  getEvents,
  getGasSpent,
  overrides,
} from './shared/utilities'

describe('integrationV3', () => {
  const loadFixture = setupFixtureLoader()

  it('makes different transactions on pairs', async () => {
    const {
      wallet,
      delay,
      other,
      token0,
      token1,
      token2,
      token3,
      pair01,
      pair23,
      swapOnUniswap: _swapOnUniswap,
    } = await loadFixture(integralAndUniswapV3Fixture)

    async function deposit(tokenX: IERC20, tokenY: IERC20, amount0: number, amount1: number) {
      await depositAndWait(delay, tokenX, tokenY, wallet, {
        amount0: expandToDecimals(amount0, await tokenX.decimals()),
        amount1: expandToDecimals(amount1, await tokenY.decimals()),
        gasLimit: 750000,
      })
    }

    async function withdraw(tokenX: IERC20, tokenY: IERC20, pair: IntegralPair, liquidity: string) {
      await withdrawAndWait(delay, pair, tokenX, tokenY, wallet, {
        liquidity: expandTo18Decimals(liquidity),
        gasLimit: 600000,
        amount0Min: BigNumber.from(0),
        amount1Min: BigNumber.from(0),
      })
    }

    async function buy(tokenIn: IERC20, tokenOut: IERC20, amountInMax: number, amountOut: number) {
      await buyAndWait(delay, tokenIn, tokenOut, wallet, {
        amountInMax: expandToDecimals(amountInMax, await tokenIn.decimals()),
        amountOut: expandToDecimals(amountOut, await tokenOut.decimals()),
        gasLimit: 600000,
      })
    }

    async function sell(tokenIn: IERC20, tokenOut: IERC20, amountIn: number, amountOutMin: number) {
      await sellAndWait(delay, tokenIn, tokenOut, wallet, {
        amountIn: expandToDecimals(amountIn, await tokenIn.decimals()),
        amountOutMin: expandToDecimals(amountOutMin, await tokenOut.decimals()),
        gasLimit: 600000,
      })
    }

    async function swapOnUniswap(tokenIn: IERC20, tokenOut: IERC20, amount: number) {
      await _swapOnUniswap({
        recipient: wallet.address,
        tokenIn,
        tokenOut,
        amountIn: expandToDecimals(amount, await tokenIn.decimals()),
        amountOutMinimum: 0,
        fee: FeeAmount.MEDIUM,
      })
    }

    let initialToken0Balance = await token0.balanceOf(wallet.address)
    let initialToken1Balance = await token1.balanceOf(wallet.address)
    const deposit0 = { amount0: 100, amount1: 150 }
    const deposit1 = { amount0: 20, amount1: 50 }

    await deposit(token0, token1, deposit0.amount0, deposit0.amount1)
    const token0MaxIn = 10
    const token1Out = 0.00001
    await buy(token0, token1, token0MaxIn, token1Out)
    await deposit(token0, token1, deposit1.amount0, deposit1.amount1)

    let tx = await delay.execute(3, overrides)
    let events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(1, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(2, true, '0x', getGasSpent(events[1]), getEthRefund(events[1]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(3, true, '0x', getGasSpent(events[2]), getEthRefund(events[2]))

    const decimals1 = await token1.decimals()
    const token0Deposited = expandToDecimals(deposit0.amount0 + deposit1.amount0, await token0.decimals())
    const token1Deposited = expandToDecimals(deposit0.amount1 + deposit1.amount1, decimals1)

    expect(await token0.balanceOf(wallet.address)).to.gt(
      initialToken0Balance.sub(token0Deposited).sub(expandToDecimals(token0MaxIn, await token0.decimals()))
    )
    const token1Balance = await token1.balanceOf(wallet.address)
    const excessedToken1 = deposit1.amount1 - (deposit0.amount1 / deposit0.amount0) * deposit1.amount0
    expect(token1Balance).to.gt(initialToken1Balance.sub(token1Deposited).add(expandToDecimals(token1Out, decimals1)))
    expect(token1Balance).to.lt(
      initialToken1Balance
        .sub(token1Deposited)
        .add(expandToDecimals(token1Out, decimals1))
        .add(expandToDecimals(excessedToken1, decimals1))
    )

    await sell(token0, token1, 3, 0.001)
    await withdraw(token0, token1, pair01, '0.000000001')
    const token0BalanceBeforeWithdraw = await token0.balanceOf(other.address)
    const token1BalanceBeforeWithdraw = await token1.balanceOf(other.address)

    tx = await delay.execute(2, overrides)
    events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(4, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(5, true, '0x', getGasSpent(events[1]), getEthRefund(events[1]))

    expect(await token0.balanceOf(wallet.address)).to.gt(token0BalanceBeforeWithdraw)
    expect(await token1.balanceOf(wallet.address)).to.gt(token1BalanceBeforeWithdraw)

    let initialToken2Balance = await token2.balanceOf(wallet.address)
    let initialToken3Balance = await token3.balanceOf(wallet.address)
    await deposit(token2, token3, 20, 30)
    await sell(token2, token3, 4, 0.003)

    await swapOnUniswap(token2, token3, 30)

    await buy(token2, token3, 40, 0.002)
    await deposit(token2, token3, 15, 15)

    tx = await delay.execute(4, overrides)
    events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(6, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(7, true, '0x', getGasSpent(events[1]), getEthRefund(events[1]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(8, true, '0x', getGasSpent(events[2]), getEthRefund(events[2]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(9, true, '0x', getGasSpent(events[3]), getEthRefund(events[3]))

    expect(await token2.balanceOf(wallet.address)).to.lt(initialToken2Balance)
    expect(await token3.balanceOf(wallet.address)).to.gt(initialToken3Balance)

    initialToken0Balance = await token0.balanceOf(wallet.address)
    initialToken1Balance = await token1.balanceOf(wallet.address)
    initialToken2Balance = await token2.balanceOf(wallet.address)
    initialToken3Balance = await token3.balanceOf(wallet.address)

    await withdraw(token2, token3, pair23, '0.005')
    await sell(token3, token2, 40, 0.1)

    await swapOnUniswap(token1, token0, 30)

    await deposit(token0, token1, 10000, 15)
    await buy(token1, token0, 100, 0.3)

    await swapOnUniswap(token0, token1, 80)

    await buy(token2, token3, 100, 0.015)
    await withdraw(token2, token3, pair23, '1')

    await swapOnUniswap(token2, token3, 40)

    await buy(token2, token3, 1.5, 1)
    await sell(token1, token0, 0.5, 2)

    tx = await delay.execute(8, overrides)
    events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(10, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(11, true, '0x', getGasSpent(events[1]), getEthRefund(events[1]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(12, true, '0x', getGasSpent(events[2]), getEthRefund(events[2]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(13, true, '0x', getGasSpent(events[3]), getEthRefund(events[3]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(14, true, '0x', getGasSpent(events[4]), getEthRefund(events[4]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(15, true, '0x', getGasSpent(events[5]), getEthRefund(events[5]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(16, true, '0x', getGasSpent(events[6]), getEthRefund(events[6]))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(17, true, '0x', getGasSpent(events[7]), getEthRefund(events[7]))

    expect(await token0.balanceOf(wallet.address)).to.lt(initialToken0Balance)
    expect(await token1.balanceOf(wallet.address)).to.lt(initialToken1Balance)
    expect(await token2.balanceOf(wallet.address)).to.lt(initialToken2Balance)
    expect(await token3.balanceOf(wallet.address)).to.gt(initialToken3Balance)
  }).timeout(40_000)
})
