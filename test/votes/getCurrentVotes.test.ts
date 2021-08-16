import { expect } from 'chai'
import { votesFixture } from '../shared/fixtures/votesFixture'
import { setupFixtureLoader } from '../shared/setup'
import { expandTo18Decimals } from '../shared/utilities'

describe('Votes.getCurrentVotes', () => {
  const loadFixture = setupFixtureLoader()

  it('no votes', async () => {
    const { votes, other } = await loadFixture(votesFixture)
    expect(await votes.getCurrentVotes(other.address)).to.eq(0)
  })

  it('votes', async () => {
    const { votes, other } = await loadFixture(votesFixture)

    await votes.writeCheckpoint(other.address, 1, expandTo18Decimals(10))
    expect(await votes.getCurrentVotes(other.address)).to.eq(expandTo18Decimals(10))
  })
})
