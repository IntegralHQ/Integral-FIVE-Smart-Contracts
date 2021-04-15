import { BigNumber, constants, Contract, providers, utils, Wallet, BigNumberish } from 'ethers'
import { IERC20, IntegralDelay } from '../../../build/types'
import { expandTo18Decimals, overrides } from '../utilities'

export const getDefaultBuy = (tokenIn: IERC20, tokenOut: IERC20, wallet: Wallet | Contract) => ({
  gasLimit: 400000,
  gasPrice: utils.parseUnits('100', 'gwei') as BigNumberish,
  etherAmount: expandTo18Decimals(0),
  wrapUnwrap: false,
  to: wallet.address,
  tokenIn: tokenIn.address,
  tokenOut: tokenOut.address,
  amountInMax: expandTo18Decimals(1),
  amountOut: expandTo18Decimals(1),
  submitDeadline: constants.MaxUint256,
  executionDeadline: constants.MaxUint256,
})

type BuyOverrides = Partial<ReturnType<typeof getDefaultBuy>>

export async function buy(
  delay: IntegralDelay,
  tokenIn: IERC20,
  tokenOut: IERC20,
  to: Wallet | Contract,
  buyOverrides?: BuyOverrides
) {
  const buyRequest = {
    ...getDefaultBuy(tokenIn, tokenOut, to),
    ...buyOverrides,
  }
  await delay.setGasPrice(buyRequest.gasPrice)
  await tokenIn.approve(delay.address, constants.MaxUint256, overrides)
  const tx = await delay.buy(buyRequest, {
    ...overrides,
    value: BigNumber.from(buyRequest.gasLimit).mul(buyRequest.gasPrice).add(buyRequest.etherAmount),
  })
  return { ...buyRequest, tx }
}

export async function buyAndWait(
  delay: IntegralDelay,
  tokenIn: IERC20,
  tokenOut: IERC20,
  to: Wallet | Contract,
  buyOverrides?: BuyOverrides
) {
  const buyRequest = await buy(delay, tokenIn, tokenOut, to, buyOverrides)
  await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [5 * 60 + 1])
  return buyRequest
}
