/**
 * An interface for performing commonly used operations on a SQL database
 *
 * This interface allows for isolated query functions to be made and used in different contexts,
 * transaction or not.
 */

import { AwaitableResult } from "../result"
import { SQLExecutable } from "./utils"

type QueryResult = {
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
        query: (tx: SQLExecutable) => AwaitableResult<SuccessValue, ErrorValue>
      ) : void
}
