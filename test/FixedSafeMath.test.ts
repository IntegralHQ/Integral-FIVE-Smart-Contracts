import { expect } from 'chai'
import { utils, Wallet, BigNumber } from 'ethers'

import { setupFixtureLoader } from './shared/setup'
import { overrides } from './shared/utilities'

import { FixedSafeMathTest, FixedSafeMathTest__factory } from '../build/types'
import { MathC__factory } from '../build/types/factories/MathC__factory'
import { MathC } from '../build/types/MathC'
import { toDecimals } from './oracle/trade.test'

describe('FixedSafeMath', () => {
  const loadFixture = setupFixtureLoader()

  async function fixture([wallet]: Wallet[]) {
    const contract = await new FixedSafeMathTest__factory(wallet).deploy(overrides)
    const math = await new MathC__factory(wallet).deploy(overrides)
    return { contract, math }
  }

  let contract: FixedSafeMathTest
  let math: MathC

  before(async () => {
    ;({ contract, math } = await loadFixture(fixture))
  })

  describe('add', () => {
    it('adds positive numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('0.5')
      const c = await contract.add(a, b)
      expect(c).to.eq(utils.parseUnits('1.8'))
    })

    it('adds negative numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('-0.5')
      const c = await contract.add(a, b)
      expect(c).to.eq(utils.parseUnits('0.8'))
    })
  })

  describe('sub', () => {
    it('can subtract positive numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('0.5')
      const c = await contract.sub(a, b)
      expect(c).to.eq(utils.parseUnits('0.8'))
    })

    it('can subtract negative numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('-0.5')
      const c = await contract.sub(a, b)
      expect(c).to.eq(utils.parseUnits('1.8'))
    })
  })

  describe('f18Mul', () => {
    it('can multiply by positive numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('0.5')
      const c = await contract.f18Mul(a, b)
      expect(c).to.eq(utils.parseUnits('0.65'))
    })

    it('can multiply by negative numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('-0.5')
      const c = await contract.f18Mul(a, b)
      expect(c).to.eq(utils.parseUnits('-0.65'))
    })
  })

  describe('f18Div', () => {
    it('can divide by positive numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('0.5')
      const c = await contract.f18Div(a, b)
      expect(c).to.eq(utils.parseUnits('2.6'))
    })

    it('can divide by negative numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('-0.5')
      const c = await contract.f18Div(a, b)
      expect(c).to.eq(utils.parseUnits('-2.6'))
    })

    it('reverts for zero', async () => {
      const a = utils.parseUnits('1.3')
      const b = utils.parseUnits('0')
      await expect(contract.f18Div(a, b)).to.be.reverted
    })
  })

  describe('f18Sqrt', () => {
    it('can compute a specific square root', async () => {
      const a = BigNumber.from('0x1e816929a78c23a8b668')
      const b = await contract.f18Sqrt(a)
      const expected = BigNumber.from('0x14935079c03425d02f')
      expect(b).to.eq(expected)
    })

    const testCases = [0.00001, 3, 4, 5, 100, 10000, 3333333333333]

    for (const test of testCases) {
      it(`${test}`, async () => {
        const a = utils.parseUnits(test.toString())
        const b = await math.sqrt(a)
        expect(b).to.eq(toDecimals(Math.sqrt(test).toString(), 9))
      })
    }

    it('can compute the square root of positive numbers', async () => {
      const a = utils.parseUnits('1.3')
      const b = await contract.f18Sqrt(a)
      expect(b).to.eq(utils.parseUnits('1.140175425099137979'))
    })

    it('reverts for negative numbers', async () => {
      const a = utils.parseUnits('-1.3')
      await expect(contract.f18Sqrt(a)).to.be.reverted
    })
  })
})
