import { deployContract } from 'ethereum-waffle'
import { Wallet, ContractFactory } from 'ethers'
import TokenShares from '../../../build/TokenShares.json'
import { Orders__factory } from '../../../build/types'
import { AddLiquidity__factory } from '../../../build/types/factories/AddLiquidity__factory'
import { BuyHelper__factory } from '../../../build/types/factories/BuyHelper__factory'
import WithdrawHelper from '../../../build/WithdrawHelper.json'
import { overrides } from '../utilities'

export async function deployLibraries(wallet: Wallet) {
  const withdrawHelper = await deployContract(wallet, WithdrawHelper, [])
  const addLiquidity = await new AddLiquidity__factory(wallet).deploy(overrides)
  const tokenShares = await new ContractFactory(TokenShares.abi, TokenShares.bytecode, wallet).deploy(overrides)
  const orders = await new Orders__factory(
    { 'contracts/libraries/TokenShares.sol:TokenShares': tokenShares.address },
    wallet
  ).deploy(overrides)
  const buyHelper = await new BuyHelper__factory(wallet).deploy(overrides)
  return {
    libraries: {
      'contracts/libraries/TokenShares.sol:TokenShares': tokenShares.address,
      'contracts/libraries/Orders.sol:Orders': orders.address,
      'contracts/libraries/AddLiquidity.sol:AddLiquidity': addLiquidity.address,
      'contracts/libraries/BuyHelper.sol:BuyHelper': buyHelper.address,
      'contracts/libraries/WithdrawHelper.sol:WithdrawHelper': withdrawHelper.address,
    },
    orders,
    tokenShares,
    buyHelper,
  }
}
