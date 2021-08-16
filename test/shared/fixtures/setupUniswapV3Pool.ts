import { IERC20__factory, IUniswapV3Pool__factory, WETH9__factory } from '../../../build/types'
import UniswapV3Router from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json'
import { encodePath, expandTo18Decimals, FeeAmount, overrides } from '../utilities'
import { Contract } from '@ethersproject/contracts'
import { constants, Wallet } from 'ethers'
import { SWAP_ROUTER, WETH } from '../uniswapV3Addresses'
import { getOracleV3FixtureFor } from './getOracleV3FixtureFor'

export async function setupUniswapV3Pool(
  poolAddress: string,
  tokens: [string, string],
  decimals: [number, number],
  wallet: Wallet
) {
  if (tokens[0].toLowerCase() > tokens[1].toLowerCase()) {
    tokens.reverse()
    decimals.reverse()
  }
  const pool = IUniswapV3Pool__factory.connect(poolAddress, wallet)
  const { oracle } = await getOracleV3FixtureFor(...decimals)([wallet])
  await oracle.setUniswapPair(poolAddress, overrides)

  const weth = WETH9__factory.connect(WETH, wallet)
  const token0 = IERC20__factory.connect(tokens[0], wallet)
  const token1 = IERC20__factory.connect(tokens[1], wallet)

  await weth.approve(SWAP_ROUTER, constants.MaxUint256, overrides)
  await token0.approve(SWAP_ROUTER, constants.MaxUint256, overrides)
  await token1.approve(SWAP_ROUTER, constants.MaxUint256, overrides)

  await weth.deposit({ value: expandTo18Decimals(1_000_000_000) })

  const router = new Contract(SWAP_ROUTER, UniswapV3Router.abi, wallet)

  await router.exactInput({
    recipient: wallet.address,
    deadline: constants.MaxUint256,
    path: encodePath([weth.address, token1.address], [FeeAmount.MEDIUM]),
    amountIn: expandTo18Decimals(50_000),
    amountOutMinimum: 0,
  })

  return { oracle, pool, router, token0, token1 }
}
