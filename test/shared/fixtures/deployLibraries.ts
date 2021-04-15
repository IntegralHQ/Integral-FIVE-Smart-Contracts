import { Wallet, ContractFactory } from 'ethers'
import TokenShares from '../../../build/TokenShares.json'
import { Orders__factory } from '../../../build/types'
import { AddLiquidity__factory } from '../../../build/types/factories/AddLiquidity__factory'
import { BuyHelper__factory } from '../../../build/types/factories/BuyHelper__factory'

export async function deployLibraries(wallet: Wallet) {
  const addLiquidity = await new AddLiquidity__factory(wallet).deploy()
  const tokenShares = await new ContractFactory(TokenShares.abi, TokenShares.bytecode, wallet).deploy()
  const orders = await new Orders__factory(
    { 'contracts/libraries/TokenShares.sol:TokenShares': tokenShares.address },
    wallet
  ).deploy()
  const buyHelper = await new BuyHelper__factory(wallet).deploy()
  return {
    libraries: {
      'contracts/libraries/TokenShares.sol:TokenShares': tokenShares.address,
      'contracts/libraries/Orders.sol:Orders': orders.address,
      'contracts/libraries/AddLiquidity.sol:AddLiquidity': addLiquidity.address,
      'contracts/libraries/BuyHelper.sol:BuyHelper': buyHelper.address,
    },
    orders,
    tokenShares,
    buyHelper,
  }
}
