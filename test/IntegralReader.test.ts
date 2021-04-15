import { expect } from 'chai'
import { pairFixture } from './shared/fixtures'
import { setupFixtureLoader } from './shared/setup'
import { expandTo18Decimals, overrides } from './shared/utilities'

import { BigNumber } from 'ethers'
import { IntegralReader__factory } from '../build/types'

describe('IntegralReader', () => {
  const loadFixture = setupFixtureLoader()

  it('returns all important parameters', async () => {
    const { addLiquidity, pair, token0, oracle, wallet } = await loadFixture(pairFixture)

    const reader = await new IntegralReader__factory(wallet).deploy(overrides)

    await addLiquidity(expandTo18Decimals(15), expandTo18Decimals(40))
    await oracle.setPrice(expandTo18Decimals(15))
    await token0.transfer(pair.address, expandTo18Decimals(10))
    await pair.sync()

    const reserves = await pair.getReserves()
    const references = await pair.getReferences()

    const mintFee = await pair.mintFee()
    const burnFee = await pair.burnFee()
    const swapFee = await pair.swapFee()

    const epoch = await oracle.epoch()
    const price = await oracle.price()
    const parameters = await oracle.getParameters()

    const result = await reader.getPairParameters(pair.address)
    expect(result).to.deep.equal([
      true,
      reserves[0],
      reserves[1],
      reserves[0],
      reserves[1],
      mintFee,
      burnFee,
      swapFee,
      references[2],
      epoch,
      price,
      parameters,
    ])
  })

  it('returns false and empty data if pair does not exist', async () => {
    const { wallet, provider } = await loadFixture(pairFixture)

    const reader = await new IntegralReader__factory(wallet).deploy(overrides)

    const result = await reader.getPairParameters(provider.createEmptyWallet().address)
    expect(result).to.deep.equal([
      false,
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
      0,
      0,
      BigNumber.from(0),
      [[], [], [], []],
    ])
  })
})
