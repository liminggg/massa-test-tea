import { Args } from '@massalabs/web3-utils'

/**
 * Represents the data of a read operation.
 *
 * @see maxGas - The maximum amount of gas that the execution of the contract is allowed to cost.
 * @see targetAddress - Target smart contract address
 * @see targetFunction - Target function name. No function is called if empty.
 * @see parameter - Parameter to pass to the target function
 * @see callerAddress - Caller address
 * @see fee of type `bigint` represents the transaction fee.
 * @see coins of type `bigint` represents the extra coins in `nanoMassa` that are spent from the caller's balance and transferred to the target.
 */
export interface IReadData {
  maxGas?: bigint
  targetAddress: string
  targetFunction: string
  parameter: Array<number> | Args
  callerAddress?: string
  /** The coin amount in nanoMassa. */
  coins?: bigint
  /** The fee amount in nanoMassa. */
  fee?: bigint
}
