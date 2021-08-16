import { MockProvider, createFixtureLoader, Fixture } from 'ethereum-waffle'
import { Wallet } from 'ethers'

type FixtureLoader = ReturnType<typeof createFixtureLoader>
interface FixtureReturns {
  provider: MockProvider
  wallet: Wallet
  other: Wallet
  another: Wallet
}

let loadFixture: ReturnType<typeof setupOnce> | undefined
export function setupFixtureLoader() {
  if (!loadFixture) {
    loadFixture = setupOnce()
  }
  return loadFixture
}

function setupOnce() {
  const loaders = new Map<Fixture<any>, { loader: FixtureLoader; returns: FixtureReturns }>()

  function makeLoader(): { loader: FixtureLoader; returns: FixtureReturns } {
    const provider = new MockProvider({
      ganacheOptions: {
        hardfork: 'istanbul',
        mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
        gasLimit: 9999999,
      },
    })
    const [wallet, other, another] = provider.getWallets()
    const loader = createFixtureLoader([wallet, other], provider)
    const returns = { provider, wallet, other, another }
    return { loader, returns }
  }

  async function loadFixture<T>(fixture: Fixture<T>): Promise<T & FixtureReturns> {
    // This function creates a new provider for each fixture, because of bugs
    // in ganache that clear contract code on evm_revert
    const { loader, returns } = loaders.get(fixture) ?? makeLoader()
    loaders.set(fixture, { loader, returns })
    const result = await loader(fixture)
    return { ...result, ...returns }
  }

  return loadFixture
}
