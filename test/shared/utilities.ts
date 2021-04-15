import { BigNumber, utils, constants, Wallet, ContractTransaction, Event } from 'ethers'
import { ERC20 } from '../../build/types'

const PERMIT_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

export function expandTo18Decimals(n: number | string): BigNumber {
  return expandToDecimals(n, 18)
}

export function expandToDecimals(n: number | string, decimals: number): BigNumber {
  return utils.parseUnits(n.toString(), decimals)
}

export function makeFloatEncodable(n: BigNumber) {
  const hex = n.toHexString()
  if (hex.length <= 8) {
    return n
  } else {
    const cutPrecision = hex.substring(0, 8).concat('0'.repeat(hex.length - 8))
    return BigNumber.from(cutPrecision)
  }
}

function getDomainSeparator(name: string, tokenAddress: string) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        utils.keccak256(
          utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
        ),
        utils.keccak256(utils.toUtf8Bytes(name)),
        utils.keccak256(utils.toUtf8Bytes('1')),
        1,
        tokenAddress,
      ]
    )
  )
}

export function getCreate2Address(
  factoryAddress: string,
  [tokenA, tokenB]: [string, string],
  bytecode: string
): string {
  const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
  const create2Inputs = [
    '0xff',
    factoryAddress,
    utils.keccak256(utils.solidityPack(['address', 'address'], [token0, token1])),
    utils.keccak256(bytecode),
  ]
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join('')}`
  return utils.getAddress(`0x${utils.keccak256(sanitizedInputs).slice(-40)}`)
}

export async function getApprovalDigest(
  token: ERC20,
  approve: {
    owner: string
    spender: string
    value: BigNumber
  },
  nonce: BigNumber,
  deadline: BigNumber
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return utils.keccak256(
    utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        utils.keccak256(
          utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        ),
      ]
    )
  )
}

export async function mineBlock(wallet: Wallet) {
  await wallet.sendTransaction({ to: constants.AddressZero, value: 1 })
}

export function encodePrice(reserve0: BigNumber, reserve1: BigNumber) {
  return [
    reserve1.mul(BigNumber.from(2).pow(112)).div(reserve0),
    reserve0.mul(BigNumber.from(2).pow(112)).div(reserve1),
  ]
}

export const overrides = {
  gasLimit: 9999999,
}

export function pairAddressToPairId(pairAddress: string) {
  return parseInt(utils.keccak256(pairAddress).slice(2, 10), 16)
}

export async function getEvents(tx: ContractTransaction, eventName: string) {
  return (await tx.wait()).events?.filter((e) => e.event === eventName) ?? []
}

// function for 'OrderExecuted' event
export function getGasSpent(event: Event) {
  return event.args?.[3]
}

// function for 'OrderExecuted' event
export function getEthRefund(event: Event) {
  return event.args?.[4]
}
