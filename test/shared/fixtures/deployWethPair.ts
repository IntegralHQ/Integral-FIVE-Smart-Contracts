import { Wallet, BigNumber } from 'ethers'

import { expandTo18Decimals, overrides } from '../utilities'
import { ERC20__factory, IntegralOracle, WETH9__factory, IntegralFactory, UnitOracle } from '../../../build/types'

import { deployPairForTokens } from './deployPairForTokens'

export async function deployWethPair(wallet: Wallet, oracle: IntegralOracle | UnitOracle, factory: IntegralFactory) {
  const weth = await new WETH9__factory(wallet).deploy(overrides)
  const token = await new ERC20__factory(wallet).deploy(expandTo18Decimals(10000), overrides)

  const pair = await deployPairForTokens(wallet, oracle, factory, weth, token)

  async function addLiquidityETH(tokenAmount: BigNumber, wethAmount: BigNumber) {
    await token.transfer(pair.pair.address, tokenAmount, overrides)
    await weth.deposit({ value: wethAmount })
    await weth.transfer(pair.pair.address, wethAmount, overrides)
    await pair.pair.mint(wallet.address, overrides)
  }

  return { weth, token, ...pair, addLiquidityETH }
}
