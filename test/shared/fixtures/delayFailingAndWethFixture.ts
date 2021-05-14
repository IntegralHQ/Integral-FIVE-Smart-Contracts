import { Wallet } from '@ethersproject/wallet'
import { BigNumber } from 'ethers'
import { FailingERC20__factory } from '../../../build/types'
import { expandTo18Decimals, overrides } from '../utilities'
import { delayFixture } from './delayFixture'
import { deployPairForTokens } from './deployPairForTokens'

export async function delayFailingAndWethFixture([wallet]: Wallet[]) {
  const { oracle, factory, weth, delay } = await delayFixture([wallet])
  const failingToken = await new FailingERC20__factory(wallet).deploy(expandTo18Decimals(100000), overrides)

  const { pair: wethPair } = await deployPairForTokens(wallet, oracle, factory, failingToken, weth)

  async function addLiquidityETH(tokenAmount: BigNumber, wethAmount: BigNumber) {
    await failingToken.transfer(wethPair.address, tokenAmount, overrides)
    await weth.deposit({ value: wethAmount })
    await weth.transfer(wethPair.address, wethAmount, overrides)
    await wethPair.mint(wallet.address, overrides)
  }

  return { delay, weth, failingToken, wethPair, addLiquidityETH }
}
