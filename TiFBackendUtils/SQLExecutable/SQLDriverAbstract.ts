/**
 * An interface for performing commonly used operations on a SQL database
 *
 * This interface allows for isolated query functions to be made and used in different contexts,
 * transaction or not.
 */
import { AwaitableResult, PromiseResult, failure, promiseResult, success } from "../result.js"

export type ExecuteResult = {
  insertId: string
  rowsAffected: number
}

export abstract class SQLDriverAbstract {
  abstract execute (
        query: string,
        args: object | null
      ): Promise<ExecuteResult>

  abstract transaction<SuccessValue, ErrorValue> (
        query: (tx: SQLDriverAbstract) => AwaitableResult<SuccessValue, ErrorValue>
      ) : PromiseResult<SuccessValue, ErrorValue>

  abstract query<Value> (
        query: string,
        args: object | null
      ): Promise<Value[]>

  // ==================
  // Generic Methods
  // ==================

  /**
   * Runs the given SQL query and returns a success result containing the insertId of the query.
   */
  executeResult (query: string, args: object | null = null) {
    return promiseResult(
      this.execute(query, args).then((executeResult) =>
        success(executeResult)
      )
    )
  }

  /**
   * Runs the given SQL query and returns a success result containing the result of the query.
   */
  queryResult<Value> (query: string, args: object | null = null) {
    return promiseResult(
      this.query<Value>(query, args).then((result) => success(result))
    )
  }

  /**
   * Returns the first result of a query in a typesafe manner.
   *
   * @example
   * ```ts
   * type User = { id: string, ... }
   *
   * const result? = await queryFirst<User>(conn, "SELECT * FROM user");
   * console.log(result?.id) // ✅ Typesafe
   * ```
   */
  queryFirstResult (query: string, args: object | null = null) {
    return promiseResult(
      this.query(query, args).then((results) =>
        results[0] ? success(results[0]) : failure("no-results" as const)
      )
    )
  }

  /**
   * Runs a query an returns a success result if the query returns 1 or more rows.
   *
   * You should not query specific data with this method, instead use a `"SELECT TRUE"`
   * if you need to perform a select.
   */
  queryHasResults (query: string, args: object | null = null) {
    return promiseResult(
      this.query(query, args).then((results) => {
        const hasResults = results.length > 0
        return hasResults ? success(hasResults) : failure(hasResults)
      })
    )
  }
}
