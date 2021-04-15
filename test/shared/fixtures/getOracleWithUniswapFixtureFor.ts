import { Wallet, BigNumber } from 'ethers'
import { deployContract } from 'ethereum-waffle'
import { IUniswapV2Factory, IUniswapV2Pair__factory, ERC20__factory } from '../../../build/types'
import UniswapFactory from '../../uniswap/UniswapFactory.json'
import { expandTo18Decimals, overrides } from '../utilities'
import { getOracleFixtureFor } from './getOracleFixtureFor'

export function getOracleWithUniswapFixtureFor(xDecimals: number, yDecimals: number) {
  return async function ([wallet]: Wallet[]) {
    const tokenA = await new ERC20__factory(wallet).deploy(expandTo18Decimals(10000000), overrides)
    const tokenB = await new ERC20__factory(wallet).deploy(expandTo18Decimals(10000000), overrides)

    const { oracle } = await getOracleFixtureFor(xDecimals, yDecimals)([wallet])
    const factory = (await deployContract(wallet, UniswapFactory, [wallet.address])) as IUniswapV2Factory
    await factory.createPair(tokenA.address, tokenB.address, overrides)
    const pairAddress = await factory.getPair(tokenA.address, tokenB.address)
    const pair = IUniswapV2Pair__factory.connect(pairAddress, wallet)

    const aIsZero = tokenA.address === (await pair.token0())
    const token0 = aIsZero ? tokenA : tokenB
    const token1 = aIsZero ? tokenB : tokenA

    async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
      await token0.transfer(pair.address, token0Amount, overrides)
      await token1.transfer(pair.address, token1Amount, overrides)
      await pair.mint(wallet.address, overrides)
    }

    return {
      token0,
      token1,
      factory,
      pair,
      oracle,
      addLiquidity,
    }
  }
}
