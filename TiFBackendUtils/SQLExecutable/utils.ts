/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Replace with backend utils
import { Connection } from "@planetscale/database"
import {
  PromiseResult,
  Result,
  failure,
  withPromise,
  success
} from "../result.js"

/**
 * An interface for performing commonly used operations on a SQL database
 *
 * This interface allows for isolated query functions to be made and used in different contexts,
 * transaction or not.
 */
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
  async execute<Value> (
    query: string,
    args: object | any[] | null = null
  ): Promise<Value[]> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const result = await this.conn.execute(query, args)
    return result.rows as Value[]
  }

  run<Value> (query: string, args: object | any[] | null = null) {
    const result = this.execute<Value>(query, args).then((values) => {
      return success(values)
    })
    return withPromise(result)
  }

  /**
   * Performs an idempotent transaction on the database and enforces a return type of Result<SuccessValue, ErrorValue>.
   */
  async transaction<SuccessValue, ErrorValue> (
    operation: (tx: SQLExecutable) => Promise<Result<SuccessValue, ErrorValue>>
  ): Promise<Result<SuccessValue, ErrorValue>> {
    return await this.conn.transaction(() => operation(this))
  }

  transactionResult<SuccessValue, ErrorValue> (
    operation: (tx: SQLExecutable) => PromiseResult<SuccessValue, ErrorValue>
  ): PromiseResult<SuccessValue, ErrorValue> {
    return withPromise(this.conn.transaction(async () => operation(this)))
  }

  // ==================
  // Generic Methods
  // ==================

  /**
   * A helper function that returns if a given sql query has any results.
   */
  async hasResults (
    query: string,
    args: object | any[] | null = null
  ): Promise<boolean> {
    const results = await this.execute(query, args)
    return results.length > 0
  }

  checkIfHasResults (query: string, args: object | any[] | null = null) {
    return withPromise(
      this.hasResults(query, args).then((hasResults) => {
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
  async queryFirst<Value> (
    query: string,
    args: object | any[] | null = null
  ): Promise<Value | undefined> {
    const results = await this.execute<Value>(query, args)
    return results[0]
  }

  queryFirstResult<Value> (query: string, args: object | any[] | null = null) {
    return withPromise(
      this.queryFirst<Value>(query, args).then((value) => {
        return value ? success(value) : failure(undefined)
      })
    )
  }

  /**
   * Gets the id of the last inserted record.
   * Every return type from this function will be a string and then it can be parsed afterwards.
   * @returns the id of the last inserted record
   */
  async selectLastInsertionId (): Promise<string | undefined> {
    const result = await this.queryFirst<{ "LAST_INSERT_ID()": string }>(
      "SELECT LAST_INSERT_ID()"
    )
    return result?.["LAST_INSERT_ID()"]
  }

  /**
   * Gets the id of the last inserted record and then attempts to return the result parsed as an int.
   * @returns the id of the last inserted record parsed as an int
   */
  async selectLastInsertionNumericId (): Promise<number | undefined> {
    const id = await this.selectLastInsertionId()
    if (!id) return undefined
    return parseInt(id)
  }
}

// Usage
// const dbConnection = ...;  // Initialize or import your database connection
// const sqlExec = new SQLExecutable(dbConnection);
// sqlExec.hasResults("SELECT * FROM users");
