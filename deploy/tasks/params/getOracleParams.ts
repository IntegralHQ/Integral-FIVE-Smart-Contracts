import { utils } from 'ethers'
import { OracleParameters, parameters } from '../utils/defaultParameters'
import wethUsdc from './curves/weth-usdc.json'
import usdcWeth from './curves/usdc-weth.json'

import usdtWeth from './curves/usdt-weth.json'
import wethUsdt from './curves/weth-usdt.json'

import wethDai from './curves/weth-dai.json'
import daiWeth from './curves/dai-weth.json'

import wbtcWeth from './curves/wbtc-weth.json'
import wethWbtc from './curves/weth-wbtc.json'

import linkWeth from './curves/link-weth.json'
import wethLink from './curves/weth-link.json'

import daiUsdc from './curves/dai-usdc.json'
import usdcDai from './curves/usdc-dai.json'

import daiUsdt from './curves/dai-usdt.json'
import usdtDai from './curves/usdt-dai.json'

import usdcUsdt from './curves/usdc-usdt.json'
import usdtUsdc from './curves/usdt-usdc.json'

export function getOracleParams(oracleName: string, token0Symbol: string) {
  switch (oracleName) {
    case 'weth-wbtc':
      return token0Symbol === 'WBTC' ? paramsToBigNumber(wbtcWeth) : paramsToBigNumber(wethWbtc)
    case 'weth-usdc':
      return token0Symbol === 'USDC' ? paramsToBigNumber(usdcWeth) : paramsToBigNumber(wethUsdc)
    case 'weth-usdt':
      return token0Symbol === 'USDT' ? paramsToBigNumber(usdtWeth) : paramsToBigNumber(wethUsdt)
    case 'weth-dai':
      return token0Symbol === 'DAI' ? paramsToBigNumber(daiWeth) : paramsToBigNumber(wethDai)
    case 'weth-link':
      return token0Symbol === 'LINK' ? paramsToBigNumber(linkWeth) : paramsToBigNumber(wethLink)
    case 'dai-usdc':
      return token0Symbol === 'DAI' ? paramsToBigNumber(daiUsdc) : paramsToBigNumber(usdcDai)
    case 'dai-usdt':
      return token0Symbol === 'DAI' ? paramsToBigNumber(daiUsdt) : paramsToBigNumber(usdtDai)
    case 'usdc-usdt':
      return token0Symbol === 'USDC' ? paramsToBigNumber(usdcUsdt) : paramsToBigNumber(usdtUsdc)
    default:
      return parameters
  }
}

interface RawParams {
  bidExponents: string[]
  bidQs: string[]
  askExponents: string[]
  askQs: string[]
}

function paramsToBigNumber(rawParams: RawParams): OracleParameters {
  const { bidExponents, bidQs, askExponents, askQs } = rawParams
  if (bidExponents.length !== bidQs.length || askExponents.length !== askQs.length) {
    throw new Error('Parameter arrays need to have equal length')
  }
  return [bidExponents, bidQs, askExponents, askQs].map((paramsArray) =>
    paramsArray.map((value) => utils.parseUnits(value))
  ) as OracleParameters
}
