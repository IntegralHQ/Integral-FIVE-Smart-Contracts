import { BigNumber, constants, Contract, providers, utils, Wallet, BigNumberish } from 'ethers'
import { DelayTest, IERC20 } from '../../../build/types'
import { expandTo18Decimals, overrides } from '../utilities'

export const getDefaultDeposit = (token0: IERC20, token1: IERC20, wallet: Wallet | Contract) => ({
  gasLimit: 690000,
  gasPrice: utils.parseUnits('100', 'gwei') as BigNumberish,
  etherAmount: expandTo18Decimals(0),
  amount0: expandTo18Decimals(2),
  amount1: expandTo18Decimals(2),
  initialRatio: expandTo18Decimals(1),
  minRatioChangeToSwap: 0,
  minSwapPrice: expandTo18Decimals(0),
  maxSwapPrice: expandTo18Decimals(0),
  wrap: false,
  to: wallet.address,
  token0: token0.address,
  token1: token1.address,
  submitDeadline: constants.MaxUint256,
  executionDeadline: constants.MaxUint256,
})

type DepositOverrides = Partial<ReturnType<typeof getDefaultDeposit>>

export async function deposit(
  delay: DelayTest,
  token0: IERC20,
  token1: IERC20,
  to: Wallet | Contract,
  depositOverrides?: DepositOverrides
) {
  const depositRequest = {
    ...getDefaultDeposit(token0, token1, to),
    ...depositOverrides,
  }
  if (!depositOverrides?.initialRatio && !depositRequest.amount1.eq(0) && !depositRequest.amount0.eq(0)) {
    depositRequest.initialRatio = depositRequest.amount0.mul(BigNumber.from(10).pow(18)).div(depositRequest.amount1)
  }
  await delay.setGasPrice(depositRequest.gasPrice)
  await token0.approve(delay.address, constants.MaxUint256, overrides)
  await token1.approve(delay.address, constants.MaxUint256, overrides)
  const tx = await delay.deposit(depositRequest, {
    ...overrides,
    gasPrice: 0,
    value: BigNumber.from(depositRequest.gasLimit).mul(depositRequest.gasPrice).add(depositRequest.etherAmount),
  })
  return { ...depositRequest, tx }
}

export async function depositAndWait(
  delay: DelayTest,
  token0: IERC20,
  token1: IERC20,
  to: Wallet | Contract,
  depositOverrides?: DepositOverrides
) {
  const depositRequest = await deposit(delay, token0, token1, to, depositOverrides)
  await (delay.provider as providers.JsonRpcProvider).send('evm_increaseTime', [5 * 60 + 1])
  return depositRequest
}
