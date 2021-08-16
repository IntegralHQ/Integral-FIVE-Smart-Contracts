import { constants, Wallet } from 'ethers'
import { WETH9__factory } from '../../../build/types'
import { overrides } from '../utilities'
import { FeeAmount } from '../uniswapV3Utilities'
import { deployUniswapV3SwapRouter } from './deployUniswapV3SwapRouter'
import { deployUniswapV3Factory } from './deployUniswapV3Factory'
import { deployUniswapV3Pool } from './deployUniswapV3Pool'
import { getOracleV3FixtureFor } from './getOracleV3FixtureFor'

export function getV3FixtureFor(xDecimals: number, yDecimals: number, fee: FeeAmount, price: number) {
  return async function ([wallet]: Wallet[]) {
    const uniswapV3Factory = (await deployUniswapV3Factory(wallet)).uniswapV3Factory
    const { token0, token1, uniswapV3Pool, createObservations } = await deployUniswapV3Pool(wallet, {
      xDecimals,
      yDecimals,
      fee,
      price,
      uniswapV3Factory,
    })
    await createObservations()
    const { oracle } = await getOracleV3FixtureFor(await token0.decimals(), await token1.decimals())([wallet])
    await oracle.setUniswapPair(uniswapV3Pool.address, overrides)

    const weth = await new WETH9__factory(wallet).deploy(overrides)
    const { swapRouter, swapOnUniswap } = await deployUniswapV3SwapRouter(uniswapV3Factory, weth, wallet)
    await token0.approve(swapRouter.address, constants.MaxUint256, overrides)
    await token1.approve(swapRouter.address, constants.MaxUint256, overrides)

    return { oracle, uniswapV3Pool, token0, token1, swapOnUniswap, swapRouter }
  }
}
