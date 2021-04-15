import { BigNumber, constants, Contract, providers, utils, Wallet, BigNumberish } from 'ethers'
import { IERC20, IntegralDelay } from '../../../build/types'
import { expandTo18Decimals, overrides } from '../utilities'

export const getDefaultSell = (tokenIn: IERC20, tokenOut: IERC20, wallet: Wallet | Contract) => ({
  gasLimit: 400000,
  gasPrice: utils.parseUnits('100', 'gwei') as BigNumberish,
  etherAmount: expandTo18Decimals(0),
  wrapUnwrap: false,
  to: wallet.address,
  tokenIn: tokenIn.address,
  tokenOut: tokenOut.address,
  amountIn: expandTo18Decimals(1),
  amountOutMin: expandTo18Decimals(0),
  submitDeadline: constants.MaxUint256,
  executionDeadline: constants.MaxUint256,
})

type SellOverrides = Partial<ReturnType<typeof getDefaultSell>>

export async function sell(
  delay: IntegralDelay,
  tokenIn: IERC20,
  tokenOut: IERC20,
  to: Wallet | Contract,
  sellOverrides?: SellOverrides
) {
  const sellRequest = {
    ...getDefaultSell(tokenIn, tokenOut, to),
    ...sellOverrides,
  }
  await delay.setGasPrice(sellRequest.gasPrice, overrides)
  await tokenIn.approve(delay.address, constants.MaxUint256, overrides)
  const tx = await delay.sell(sellRequest, {
    ...overrides,
    value: BigNumber.from(sellRequest.gasLimit).mul(sellRequest.gasPrice).add(sellRequest.etherAmount),
  })
  return { ...sellRequest, tx }
}

export async function sellAndWait(
  delay: IntegralDelay,
  tokenIn: IERC20,
  tokenOut: IERC20,
  to: Wallet | Contract,
  sellOverrides?: SellOverrides
) {
  const sellRequest = await sell(delay, tokenIn, tokenOut, to, sellOverrides)
  await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [5 * 60 + 1])
  return sellRequest
}
