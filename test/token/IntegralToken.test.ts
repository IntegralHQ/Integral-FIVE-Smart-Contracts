import { expect } from 'chai'
import { tokenFixture } from '../shared/fixtures'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals } from '../shared/utilities'

describe('IntegralToken', () => {
  type TokenProperty = 'name' | 'symbol' | 'decimals' | 'totalSupply'
  const loadFixture = setupFixtureLoader()
  const testCases: { property: TokenProperty; value: any }[] = [
    { property: 'name', value: 'Integral' },
    { property: 'symbol', value: 'ITGR' },
    { property: 'decimals', value: 18 },
    { property: 'totalSupply', value: expandTo18Decimals(10_000_000_000) },
  ]

  testCases.forEach((testCase) => {
    it(`has proper ${testCase.property}`, async () => {
      const { token } = await loadFixture(tokenFixture)
      expect(await token[testCase.property]()).to.eq(testCase.value)
    })
  })

  it('initial balanceOf is zero', async () => {
    const { token, other } = await loadFixture(tokenFixture)
    expect(await token.balanceOf(other.address)).to.eq(0)
  })

  it('balance of deployer equals initialAmount', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    expect(await token.balanceOf(wallet.address)).to.eq(expandTo18Decimals(10_000_000_000))
  })

  it('deployer is owner and minter', async () => {
    const { token, wallet } = await loadFixture(tokenFixture)
    expect(await token.owner()).to.eq(wallet.address)
    expect(await token.isMinter(wallet.address)).to.be.true
  })
})
