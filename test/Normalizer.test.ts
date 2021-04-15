import { expect } from 'chai'
import { utils } from 'ethers'

import { setupFixtureLoader } from './shared/setup'
import { normalizerFixture } from './shared/fixtures'
import { overrides } from './shared/utilities'

describe('Normalizer', () => {
  const loadFixture = setupFixtureLoader()

  describe('normalizer', () => {
    it('8 decimals amount', async () => {
      const { normalizer } = await loadFixture(normalizerFixture)

      expect(await normalizer._normalizeAmount(1, 8, overrides)).to.eq(utils.parseUnits('1', 10))
      expect(await normalizer._normalizeAmount(10, 8, overrides)).to.eq(utils.parseUnits('10', 10))
      expect(await normalizer._normalizeAmount(utils.parseUnits('10', 8), 8, overrides)).to.eq(
        utils.parseUnits('10', 18)
      )
    })

    it('20 decimals amount', async () => {
      const { normalizer } = await loadFixture(normalizerFixture)

      expect(await normalizer._normalizeAmount(1, 20, overrides)).to.eq(0)
      expect(await normalizer._normalizeAmount(11, 20, overrides)).to.eq(0)
      expect(await normalizer._normalizeAmount(111, 20, overrides)).to.eq(1)
      expect(await normalizer._normalizeAmount(1111, 20, overrides)).to.eq(11)
      expect(await normalizer._normalizeAmount(utils.parseUnits('1', 20), 20, overrides)).to.eq(
        utils.parseUnits('1', 18)
      )
    })
  })

  describe('denormalize', () => {
    it('8 decimals amount', async () => {
      const { normalizer } = await loadFixture(normalizerFixture)

      expect(await normalizer._denormalizeAmount(1, 8, overrides)).to.eq(0)
      expect(await normalizer._denormalizeAmount(10, 8, overrides)).to.eq(0)
      expect(await normalizer._denormalizeAmount(utils.parseUnits('1', 8), 8, overrides)).to.eq(0)
      expect(await normalizer._denormalizeAmount(utils.parseUnits('1', 18), 8, overrides)).to.eq(
        utils.parseUnits('1', 8)
      )
    })

    it('20 decimals amount', async () => {
      const { normalizer } = await loadFixture(normalizerFixture)

      expect(await normalizer._denormalizeAmount(1, 20, overrides)).to.eq(100)
      expect(await normalizer._denormalizeAmount(11, 20, overrides)).to.eq(1100)
      expect(await normalizer._denormalizeAmount(111, 20, overrides)).to.eq(11100)
      expect(await normalizer._denormalizeAmount(1111, 20, overrides)).to.eq(111100)
      expect(await normalizer._denormalizeAmount(utils.parseUnits('1', 20), 20, overrides)).to.eq(
        utils.parseUnits('1', 22)
      )
    })
  })
})
