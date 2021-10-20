import { expect } from 'chai'
import { BigNumber, providers } from 'ethers'
import { depositAndWait, sellAndWait } from '../shared/orders'
import { delayFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals, getEthRefund, getEvents, getGasSpent, mineBlock, overrides } from '../shared/utilities'

describe('IntegralDelay.cancelOrder', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if order time did not exceed', async () => {
    const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(100))
    await depositAndWait(delay, token0, token1, wallet)

    await expect(delay.cancelOrder(1, overrides)).to.be.revertedWith('ID_ORDER_NOT_EXCEEDED')
    await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [24 * 59 * 60 - 60 * 60])
    await mineBlock(wallet)
    await expect(delay.cancelOrder(1, overrides)).to.be.revertedWith('ID_ORDER_NOT_EXCEEDED')
  })

  it('cancels if time exceeded', async () => {
    const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(100))
    await depositAndWait(delay, token0, token1, wallet)
    await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [24 * 60 * 60 + 1])
    await mineBlock(wallet)

    expect(await delay.isOrderCanceled(1)).to.be.false

    await delay.cancelOrder(1)

    expect(await delay.isOrderCanceled(1)).to.be.true
  })

  it('removes from queue', async () => {
    const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(100))
    await depositAndWait(delay, token0, token1, wallet)
    await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [24 * 60 * 60 + 1])
    await mineBlock(wallet)

    await delay.cancelOrder(1, overrides)

    expect(await delay.getOrder(1)).to.deep.eq([0, BigNumber.from(0)])
  })

  it('refunds tokens', async () => {
    const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(100))
    const token0Balance = await token0.balanceOf(wallet.address)
    const token1Balance = await token1.balanceOf(wallet.address)

    await depositAndWait(delay, token0, token1, wallet)
    await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [24 * 60 * 60 + 1])
    await mineBlock(wallet)

    await delay.cancelOrder(1, overrides)

    expect(await token0.balanceOf(wallet.address)).to.deep.eq(token0Balance)
    expect(await token1.balanceOf(wallet.address)).to.deep.eq(token1Balance)
  })

  it('execute ignores canceled orders', async () => {
    const { delay, token0, token1, wallet, addLiquidity } = await loadFixture(delayFixture)
    await addLiquidity(expandTo18Decimals(200), expandTo18Decimals(100))

    const token0Balance = await token0.balanceOf(wallet.address)
    const token1Balance = await token1.balanceOf(wallet.address)

    await depositAndWait(delay, token0, token1, wallet)
    await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [24 * 60 * 60 + 1])
    await mineBlock(wallet)
    const sell = await sellAndWait(delay, token0, token1, wallet)

    await delay.cancelOrder(1, overrides)

    const tx = await delay.execute(10, overrides)
    const events = await getEvents(tx, 'OrderExecuted')

    await expect(Promise.resolve(tx))
      .to.emit(delay, 'OrderExecuted')
      .withArgs(2, true, '0x', getGasSpent(events[0]), getEthRefund(events[0]))

    expect(await token0.balanceOf(wallet.address)).to.deep.eq(token0Balance.sub(sell.amountIn))
    expect((await token1.balanceOf(wallet.address)).gt(token1Balance.add(sell.amountOutMin))).to.be.true
  })
})
