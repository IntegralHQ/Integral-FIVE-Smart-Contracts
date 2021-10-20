import { Wallet } from 'ethers'
import { OrderIdTest__factory } from '../../../build/types'
import { expandTo18Decimals, overrides } from '../utilities'
import { deployDelayAndWeth } from './deployDelayAndWeth'
import { mixedDecimalsTokenPairFixture } from './mixedDecimalsTokenPairFixture'
import { setTokenTransferCosts } from './setTokenTransferCosts'

export async function delayWithMixedDecimalsPairFixture([wallet]: Wallet[]) {
  const pair = await mixedDecimalsTokenPairFixture([wallet])
  const { delay, token, wethPair, addLiquidityETH, weth, orders, libraries, buyHelper } = await deployDelayAndWeth(
    wallet,
    pair.oracle,
    pair.factory
  )
  const orderIdTest = await new OrderIdTest__factory(wallet).deploy(delay.address, overrides)
  await pair.oracle.setPrice(expandTo18Decimals(2), overrides)
  await setTokenTransferCosts(delay, [pair.token0, pair.token1, token, weth])
  return { delay, orderIdTest, orders, weth, token, wethPair, addLiquidityETH, ...pair, libraries, buyHelper }
}
