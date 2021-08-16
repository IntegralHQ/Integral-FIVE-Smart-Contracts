import { constants, providers, Wallet } from 'ethers'
import { IUniswapV3Pool__factory, IUniswapV3Factory } from '../../../build/types'
import { expandToDecimals, overrides } from '../utilities'
import { getMaxTick, getMinTick } from '../../../deploy/tasks/utils/utils'
import { getLiquidityForAmounts, getSqrtPriceX96, getSqrtRatioAtTick } from '../uniswapV3Utilities'
import { UniswapV3Minter__factory } from '../../../build/types/factories/UniswapV3Minter__factory'
import { deployTokens } from './deployTokens'

const MINUTE = 60

interface Params {
  xDecimals: number
  yDecimals: number
  fee: number
  price: number
  uniswapV3Factory: IUniswapV3Factory
}

export async function deployUniswapV3Pool(
  wallet: Wallet,
  { xDecimals, yDecimals, fee, price: priceRaw, uniswapV3Factory }: Params
) {
  const { token0, token1 } = await deployTokens(xDecimals, yDecimals, wallet)
  const [decimals0, decimals1] = [await token0.decimals(), await token1.decimals()]
  const sqrtPriceX96 = getSqrtPriceX96(decimals0, decimals1, decimals0 !== xDecimals ? 1 / priceRaw : priceRaw)

  await uniswapV3Factory.createPool(token0.address, token1.address, fee, overrides)
  const poolAddress = await uniswapV3Factory.getPool(token0.address, token1.address, fee, overrides)
  const uniswapV3Pool = IUniswapV3Pool__factory.connect(poolAddress, wallet)
  await uniswapV3Pool.initialize(sqrtPriceX96, overrides)

  const uniswapV3Minter = await new UniswapV3Minter__factory(wallet).deploy(overrides)
  await token0.approve(uniswapV3Minter.address, constants.MaxUint256, overrides)
  await token1.approve(uniswapV3Minter.address, constants.MaxUint256, overrides)

  async function addUniswapLiquidity(amount0: number, amount1: number, tickRange?: [number, number]) {
    const tickSpacing = await uniswapV3Pool.tickSpacing()
    const tickLower = tickRange ? tickRange[0] : getMinTick(tickSpacing)
    const tickUpper = tickRange ? tickRange[1] : getMaxTick(tickSpacing)

    const amount0Desired = expandToDecimals(amount0, decimals0)
    const amount1Desired = expandToDecimals(amount1, decimals1)

    const { sqrtPriceX96 } = await uniswapV3Pool.slot0()
    const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower)
    const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper)

    const liquidity = getLiquidityForAmounts(sqrtPriceX96, sqrtRatioAX96, sqrtRatioBX96, amount0Desired, amount1Desired)

    await uniswapV3Minter.mint(
      {
        pool: uniswapV3Pool.address,
        recipient: wallet.address,
        tickLower,
        tickUpper,
        liquidity,
      },
      overrides
    )

    await (wallet.provider as providers.JsonRpcProvider).send('evm_increaseTime', [MINUTE])
  }

  async function createObservations() {
    await uniswapV3Pool.increaseObservationCardinalityNext(20, overrides)
    await addUniswapLiquidity(1000, 1000)
    await addUniswapLiquidity(500, 500, [-6000, 3000])
    await addUniswapLiquidity(400, 700, [-600, 600])
    await addUniswapLiquidity(1200, 800, [-60, 120])
  }

  return { uniswapV3Pool, token0, token1, createObservations }
}
