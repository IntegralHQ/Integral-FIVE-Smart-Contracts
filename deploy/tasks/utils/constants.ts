import { Network } from '../../shared/wallet'

type Tokens = { [key in Network]: { [symbol: string]: string | undefined } }

export const KNOWN_TOKENS: Tokens = {
  ganache: {
    wbtc: '0xA193E42526F1FEA8C99AF609dcEabf30C1c29fAA',
    usdc: '0xFDFEF9D10d929cB3905C71400ce6be1990EA0F34',
    usdt: '0xaC8444e7d45c34110B34Ed269AD86248884E78C7',
    dai: '0x94BA4d5Ebb0e05A50e977FFbF6e1a1Ee3D89299c',
    weth: '0xFf807885934003A35b1284d7445fc83Fd23417e5',
  },
  kovan: {
    wbtc: undefined,
    usdc: undefined,
    usdt: undefined,
    dai: undefined,
    weth: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
  },
  ropsten: {
    wbtc: '0x2d80502854fc7304c3e3457084de549f5016b73f',
    usdc: '0x0d9c8723b343a8368bebe0b5e89273ff8d712e3c',
    usdt: undefined,
    dai: '0xad6d458402f60fd3bd25163575031acdce07538d',
    weth: '0xc778417e063141139fce010982780140aa0cd5ab',
  },
  mainnet: {
    wbtc: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    usdt: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    dai: '0x6b175474e89094c44da98b954eedeac495271d0f',
    weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    link: '0x514910771af9ca656af840dff83e8264ecf986ca',
  },
}

export const UNISWAP_V2_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'

// https://github.com/Uniswap/uniswap-v3-periphery/blob/767e779227a4f10fc7f4b4d90b103e9dfd252677/testnet-deploys.md
export const UNISWAP_V3_FACTORY = {
  kovan: '0x74e838ECf981Aaef2523aa5B666175DA319D8D31',
  mainnet: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  ganache: '',
  ropsten: '0x273Edaa13C845F605b5886Dd66C89AB497A6B17b',
}
export const NON_FUNGIBLE_POSITION_MANAGER = '0x815BCC87613315327E04e4A3b7c96a79Ae80760c'
