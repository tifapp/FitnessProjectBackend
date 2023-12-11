/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Replace with backend utils
import { Connection } from "@planetscale/database"
import { AwaitableResult, failure, promiseResult, success } from "../result.js"

/**
 * An interface for performing commonly used operations on a SQL database
 *
 * This interface allows for isolated query functions to be made and used in different contexts,
 * transaction or not.
 */

type QueryResult = {
  insertId: string
  rowsAffected: number
}

export class SQLExecutable {
  private conn: Connection // Define the appropriate type for your database connection

  constructor (connection: Connection) {
    // Use the appropriate type for the connection
    this.conn = connection
  }

  // ==================
  // Implementation-Dependent Methods
  // ==================

  /**
   * Loads a list of results from the database given a sql query and casts the result to `Value`
   *
   * @example
   * ```ts
   * type User = { id: string, ... }
   *
   * const results = await execute<User>(conn, "SELECT * FROM user");
   * console.log(results[0].id) // ✅ Typesafe
   * ```
   */

  private async execute<Value> (
    query: string,
    args: object | any[] | null = null
  ): Promise<Value[]> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const result = await this.conn.execute(query, args)
    return result.rows as Value[]
  }

  private async executeAndReturnQueryResult (
    query: string,
    args: object | any[] | null = null
  ): Promise<QueryResult> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const result = await this.conn.execute(query, args)
    return { ...result }
  }

  /**
   * Runs the given SQL query and returns a success result containing the insertId of the query.
   */
  queryResult (query: string, args: object | any[] | null = null) {
    return promiseResult(
      this.executeAndReturnQueryResult(query, args).then((queryResult) =>
        success(queryResult)
      )
    )
  }

  /**
   * Runs the given SQL query and returns a success result containing the result of the query.
   */
  queryResults<Value> (query: string, args: object | any[] | null = null) {
    return promiseResult(
      this.execute<Value>(query, args).then((result) => success(result))
    )
  }

  /**
   * Performs an idempotent transaction and returns the result of the transaction wrapped in a {@link PromiseResult}.
   */
  transaction<SuccessValue, ErrorValue> (
    query: (tx: SQLExecutable) => AwaitableResult<SuccessValue, ErrorValue>
  ) {
    return promiseResult(this.conn.transaction(async () => query(this)))
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
      this.execute(query, args).then((results) => {
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
      this.execute<Value>(query, args).then((results) =>
        results[0] ? success(results[0]) : failure("no-results" as const)
      )
    )
  }
}

// Usage
// const dbConnection = ...;  // Initialize or import your database connection
// const sqlExec = new SQLExecutable(dbConnection);
// sqlExec.queryHasResults("SELECT * FROM users");
