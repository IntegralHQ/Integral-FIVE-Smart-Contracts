import { constants, providers, Wallet } from 'ethers'
import { WETH9__factory } from '../../../build/types'
import { factoryFixture } from './factoryFixture'
import { overrides } from '../utilities'
import { deployPairForTokens } from './deployPairForTokens'
import { setTokenTransferCosts } from './setTokenTransferCosts'
import { deployDelay } from './deployDelay'
import { FeeAmount } from '../uniswapV3Utilities'
import { deployUniswapV3Factory } from './deployUniswapV3Factory'
import { deployUniswapV3Pool } from './deployUniswapV3Pool'
import { getOracleV3FixtureFor } from './getOracleV3FixtureFor'
import { deployUniswapV3SwapRouter } from './deployUniswapV3SwapRouter'

const TWO_MINUTES = 2 * 60

export async function integralAndUniswapV3Fixture([wallet]: Wallet[]) {
  const { uniswapV3Factory } = await deployUniswapV3Factory(wallet)

  const {
    token0,
    token1,
    uniswapV3Pool: uniswapPool01,
    createObservations: createObservations01,
  } = await deployUniswapV3Pool(wallet, {
    xDecimals: 6,
    yDecimals: 18,
    fee: FeeAmount.MEDIUM,
    price: 2100,
    uniswapV3Factory,
  })
  const {
    token0: token2,
    token1: token3,
    uniswapV3Pool: uniswapPool23,
    createObservations: createObservations23,
  } = await deployUniswapV3Pool(wallet, {
    xDecimals: 18,
    yDecimals: 18,
    fee: FeeAmount.MEDIUM,
    price: 116.28,
    uniswapV3Factory,
  })

  await createObservations01()
  await createObservations23()

  const { oracle: oracle01 } = await getOracleV3FixtureFor(await token0.decimals(), await token1.decimals())([wallet])
  const { oracle: oracle23 } = await getOracleV3FixtureFor(await token2.decimals(), await token3.decimals())([wallet])
  await oracle01.setUniswapPair(uniswapPool01.address, overrides)
  await oracle23.setUniswapPair(uniswapPool23.address, overrides)

  const weth = await new WETH9__factory(wallet).deploy(overrides)
  const { swapRouter, swapOnUniswap } = await deployUniswapV3SwapRouter(uniswapV3Factory, weth, wallet)
  await token0.approve(swapRouter.address, constants.MaxUint256, overrides)
  await token1.approve(swapRouter.address, constants.MaxUint256, overrides)
  await token2.approve(swapRouter.address, constants.MaxUint256, overrides)
  await token3.approve(swapRouter.address, constants.MaxUint256, overrides)

  await (wallet.provider as providers.Web3Provider).send('evm_increaseTime', [TWO_MINUTES])
  await oracle01.updatePrice(overrides)
  await oracle23.updatePrice(overrides)

  const { factory } = await factoryFixture([wallet])
  const { delay } = await deployDelay(wallet, factory, weth)
  const { pair: pair01 } = await deployPairForTokens(wallet, oracle01.address, factory, token0, token1)
  const { pair: pair23 } = await deployPairForTokens(wallet, oracle23.address, factory, token2, token3)
  await setTokenTransferCosts(delay, [token0, token1, token2, token3])

  return {
    delay,
    token0,
    token1,
    token2,
    token3,
    oracle01,
    oracle23,
    swapOnUniswap,
    pair01,
    pair23,
    factory,
    uniswapV3Factory,
    uniswapPool01,
  }
}
