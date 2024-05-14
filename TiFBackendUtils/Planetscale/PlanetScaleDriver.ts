import { Connection } from "@planetscale/database"
import { QueryResult, SQLDriverInterface } from "../SQLExecutable/SQLDriverInterface.js"
import { AwaitableResult, PromiseResult, promiseResult } from "../result.js"
export class PlanetScaleSQLDriver implements SQLDriverInterface {
  private conn: Connection // Define the appropriate type for your database connection

  constructor (connection: Connection) {
    // Use the appropriate type for the connection
    this.conn = connection
  }

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
    args: object | null
  ): Promise<Value[]> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const result = await this.conn.execute(query, args)
    return result.rows as Value[]
  }

  // ==================
  // Implementation-Dependent Methods
  // ==================

  async executeAndReturnQueryResult (
    query: string,
    args: object | null
  ): Promise<QueryResult> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const result = await this.conn.execute(query, args)
    return { ...result }
  }

  /**
   * Performs an idempotent transaction and returns the result of the transaction wrapped in a {@link PromiseResult}.
   */
  transaction<SuccessValue, ErrorValue> (
    query: (tx: SQLDriverInterface) => AwaitableResult<SuccessValue, ErrorValue>
  ): PromiseResult<SuccessValue, ErrorValue> {
    return promiseResult(this.conn.transaction(async () => query(this)))
  }
}
