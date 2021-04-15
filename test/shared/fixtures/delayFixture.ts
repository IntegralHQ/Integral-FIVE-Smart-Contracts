import { Wallet } from 'ethers'
import { OrderIdTest__factory } from '../../../build/types/factories/OrderIdTest__factory'
import { expandTo18Decimals } from '../utilities'
import { deployDelayAndWeth } from './deployDelayAndWeth'
import { pairFixture } from './pairFixture'
import { setTokenTransferCosts } from './setTokenTransferCosts'

export async function delayFixture([wallet]: Wallet[]) {
  const pair = await pairFixture([wallet])
  const { delay, token, wethPair, addLiquidityETH, weth, orders, libraries, buyHelper } = await deployDelayAndWeth(
    wallet,
    pair.oracle,
    pair.factory
  )
  const orderIdTest = await new OrderIdTest__factory(wallet).deploy(delay.address)
  await pair.oracle.setPrice(expandTo18Decimals(2))
  await setTokenTransferCosts(delay, [pair.token0, pair.token1, token, weth])
  return { delay, orderIdTest, orders, weth, token, wethPair, addLiquidityETH, ...pair, libraries, buyHelper }
}
