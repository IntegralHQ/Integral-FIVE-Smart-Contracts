import { ContractFactory, Wallet } from 'ethers'
import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'
import { IUniswapV3Factory } from '../../../build/types'
import { overrides } from '../utilities'

export async function deployUniswapV3Factory(wallet: Wallet) {
  const uniswapV3Factory = (await new ContractFactory(UniswapV3Factory.abi, UniswapV3Factory.bytecode, wallet).deploy(
    overrides
  )) as IUniswapV3Factory
  return { uniswapV3Factory }
}
