import { BigNumber, utils, Wallet, providers } from 'ethers'
import { Multicall__factory } from '../../../build/types'
import { delayFixture } from './delayFixture'
import { deposit, sell } from '../orders'
import { pairFixture } from './pairFixture'
import { OrderTypes } from '../../../scripts/utils'
import { mineBlock } from '../utilities'

export async function botFixture([wallet]: Wallet[]) {
  const { delay, token0, token1 } = await delayFixture([wallet])
  await pairFixture([wallet])
  await delay.setGasPrice(utils.parseUnits('79', 'gwei'))

  async function addOrders() {
    await deposit(delay, token0, token1, wallet)
    await deposit(delay, token0, token1, wallet)
    await sell(delay, token0, token1, wallet)

    return [
      { orderId: 1, orderType: OrderTypes.deposit, validAfterTimestamp: BigNumber.from(0) },
      { orderId: 2, orderType: OrderTypes.deposit, validAfterTimestamp: BigNumber.from(0) },
      { orderId: 3, orderType: OrderTypes.sell, validAfterTimestamp: BigNumber.from(0) },
    ]
  }

  async function increaseTime(ms?: number) {
    await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [
      (ms ? Math.ceil(ms / 1000) : 5 * 60) + 1,
    ])
    await mineBlock(wallet)
  }

  const multicall = await new Multicall__factory(wallet).deploy()
  const emptyWallet = new Wallet(Wallet.createRandom().privateKey, wallet.provider)

  return { delay, multicall, addOrders, increaseTime, emptyWallet }
}
