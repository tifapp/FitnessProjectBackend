/**
 * An interface for performing commonly used operations on a SQL database
 *
 * This interface allows for isolated query functions to be made and used in different contexts,
 * transaction or not.
 */

import { AwaitableResult, PromiseResult } from "../result.js"

export type QueryResult = {
    insertId: string
    rowsAffected: number
  }

export interface SQLDriverInterface {
    execute<Value> (
        query: string,
        args: object | null
      ): Promise<Value[]>

    executeAndReturnQueryResult (
        query: string,
        args: object | null
    ): Promise<QueryResult>

    transaction<SuccessValue, ErrorValue> (
        query: (tx: SQLDriverInterface) => AwaitableResult<SuccessValue, ErrorValue>
      ) : PromiseResult<SuccessValue, ErrorValue>
}
