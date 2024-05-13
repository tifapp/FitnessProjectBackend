/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Replace with backend utils
// import { Connection } from "@planetscale/database"
import { failure, promiseResult, success } from "../result.js"
import { SQLDriverInterface } from "./SQLDriverInterface.js"

export class SQLExecutable {
  private driver: SQLDriverInterface // Define the appropriate type for your database connection

  constructor (driver: SQLDriverInterface) {
    // Use the appropriate type for the connection
    this.driver = driver
  }

  /**
   * Runs the given SQL query and returns a success result containing the insertId of the query.
   */
  queryResult (query: string, args: object | any[] | null = null) {
    return promiseResult(
      this.driver.executeAndReturnQueryResult(query, args).then((queryResult) =>
        success(queryResult)
      )
    )
  }

  /**
   * Runs the given SQL query and returns a success result containing the result of the query.
   */
  queryResults<Value> (query: string, args: object | any[] | null = null) {
    return promiseResult(
      this.driver.execute<Value>(query, args).then((result) => success(result))
    )
  }

  // ==================
  // Generic Methods
  // ==================

  /**
   * Runs a query an returns a success result if the query returns 1 or more rows.
   *
   * You should not query specific data with this method, instead use a `"SELECT TRUE"`
   * if you need to perform a select.
   */
  queryHasResults (query: string, args: object | any[] | null = null) {
    return promiseResult(
      this.driver.execute(query, args).then((results) => {
        const hasResults = results.length > 0
        return hasResults ? success(hasResults) : failure(hasResults)
      })
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
  queryFirstResult<Value> (query: string, args: object | any[] | null = null) {
    return promiseResult(
      this.driver.execute<Value>(query, args).then((results) =>
        results[0] ? success(results[0]) : failure("no-results" as const)
      )
    )
  }
}