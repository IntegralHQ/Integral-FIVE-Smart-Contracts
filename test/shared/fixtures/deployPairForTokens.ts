import { Wallet, BigNumber, utils } from 'ethers'

import { overrides } from '../utilities'

import { IntegralPair__factory, IntegralFactory, IERC20 } from '../../../build/types'

export async function deployPairForTokens(
  wallet: Wallet,
  oracle: string,
  factory: IntegralFactory,
  tokenA: IERC20,
  tokenB: IERC20
) {
  const TRADER_ADDRESS = `0x${'f'.repeat(40)}` // TODO: get from parameters
  await factory.createPair(tokenA.address, tokenB.address, oracle, TRADER_ADDRESS, overrides)
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address)
  const pair = IntegralPair__factory.connect(pairAddress, wallet)

  const token0Address = await pair.token0()
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA

  async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
    await token0.transfer(pair.address, token0Amount, overrides)
    await token1.transfer(pair.address, token1Amount, overrides)
    await pair.mint(wallet.address, overrides)
  }

  async function getState() {
    return {
      walletLiquidity: await pair.balanceOf(wallet.address),
      factoryLiquidity: await pair.balanceOf(factory.address),
      totalLiquidity: await pair.totalSupply(),
      walletToken0Balance: await token0.balanceOf(wallet.address),
      walletToken1Balance: await token1.balanceOf(wallet.address),
      reserves: await pair.getReserves(),
      references: await pair.getReferences(),
      fees: await pair.getFees(),
      pairToken0Balance: await token0.balanceOf(pair.address),
      pairToken1Balance: await token1.balanceOf(pair.address),
    }
  }

  const PRECISION: BigNumber = utils.parseUnits('1')

  // Set specific fees for testing, ignoring defaults. Each fee is different to prevent errors
  await factory.setMintFee(token0.address, token1.address, utils.parseUnits('0.001'))
  await factory.setBurnFee(token0.address, token1.address, utils.parseUnits('0.002'))
  await factory.setSwapFee(token0.address, token1.address, utils.parseUnits('0.003'))

  const SWAP_FEE: BigNumber = await pair.swapFee()
  const SWAP_FEE_N = parseFloat(utils.formatUnits(SWAP_FEE))
  const MINT_FEE: BigNumber = await pair.mintFee()
  const MINT_FEE_N = parseFloat(utils.formatUnits(MINT_FEE))
  const BURN_FEE: BigNumber = await pair.burnFee()
  const BURN_FEE_N = parseFloat(utils.formatUnits(BURN_FEE))

  const MINIMUM_LIQUIDITY: BigNumber = await pair.MINIMUM_LIQUIDITY()

  return {
    factory,
    token0,
    token1,
    pair,
    oracle,
    addLiquidity,
    getState,
    SWAP_FEE,
    SWAP_FEE_N,
    MINT_FEE,
    MINT_FEE_N,
    BURN_FEE,
    BURN_FEE_N,
    MINIMUM_LIQUIDITY,
    PRECISION,
  }
}
