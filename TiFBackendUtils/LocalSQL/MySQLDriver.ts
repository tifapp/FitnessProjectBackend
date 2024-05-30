import { ResultSetHeader, RowDataPacket } from "mysql2"
import mysql from "mysql2/promise.js"
import { AwaitableResult, failure, promiseResult, success } from "../result.js"

type ExecuteResult = {
  insertId: string
  rowsAffected: number
}

const isResultSetHeader = (result: ResultSetHeader): result is ResultSetHeader => {
  return "insertId" in result && "affectedRows" in result
}

const typecasts: Record<string, (value: string | null) => unknown> = {
  INT64: (value) => parseInt(value ?? "0"),
  INT8: (value) => parseInt(value ?? "0") > 0,
  DATETIME: (value) => { return value ? new Date(value) : value },
  DECIMAL: (value) => { return value ? parseFloat(value) : value }
}

const castTypes = (rows: RowDataPacket[]): RowDataPacket[] => {
  return rows.map(row => {
    for (const key in row) {
      if (typecasts[key]) {
        row[key] = typecasts[key](row[key])
      }
    }
    return row
  })
}

export class MySQLExecutableDriver {
  private conn: Promise<mysql.Connection>

  constructor (connection: Promise<mysql.Connection>) {
    this.conn = connection
  }

  async closeConnection () {
    const conn = await this.conn
    conn.end()
  }

  // ==================
  // Implementation-Dependent Methods
  // ==================

  async execute (
    query: string,
    args: object | (number | string)[] | null = null
  ): Promise<ExecuteResult> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const conn = await this.conn
    const [result] = await conn.execute<ResultSetHeader>(query, args)
    if (isResultSetHeader(result)) {
      return {
        insertId: result.insertId.toString(),
        rowsAffected: result.affectedRows
      }
    } else {
      throw new Error("Execution did not return a ResultSetHeader.")
    }
  }

  /**
   * Runs the given SQL query and returns a success result containing the insertId of the query.
   */
  executeResult (query: string, args: object | (number | string)[] | null = null) {
    return promiseResult(
      this.execute(query, args).then((executeResult) =>
        success(executeResult)
      )
    )
  }

  /**
   * Runs the given SQL query and returns a success result containing the result of the query.
   */
  queryResult<Value> (query: string, args: object | (number | string)[] | null = null) {
    return promiseResult(
      this.query<Value>(query, args).then((result) => success(result))
    )
  }

  /**
   * Performs an idempotent transaction and returns the result of the transaction wrapped in a {@link PromiseResult}.
   */
  transaction<SuccessValue, ErrorValue> (
    querySQLTransaction: (tx: MySQLExecutableDriver) => AwaitableResult<SuccessValue, ErrorValue>
  ) {
    console.log("trying transaction")
    return promiseResult((async () => {
      const conn = await this.conn
      try {
        await conn.beginTransaction()
        const result = await querySQLTransaction(this)
        await conn.commit()
        return result
      } catch (error) {
        console.log("Rollback called")
        await conn.rollback()
        throw error
      }
    })())
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

  async query<Value> (
    query: string,
    args: object | (number | string)[] | null
  ): Promise<Value[]> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const conn = await this.conn
    const [rows] = await conn.query(query, args)
    if (Array.isArray(rows)) {
      // When converting the mySQL values to say a boolean or number we use the castTypes function
      return castTypes(rows as RowDataPacket[]) as Value[]
    } else {
      throw new Error("Query did not return an array of rows.")
    }
  }

  // ==================
  // Generic Methods
  // ==================

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
  queryFirstResult<Value> (query: string, args: object | (number | string)[] | null = null) {
    return promiseResult(
      this.query<Value>(query, args).then((results) =>
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
  queryHasResults (query: string, args: object | (number | string)[] | null = null) {
    return promiseResult(
      this.query(query, args).then((results) => {
        const hasResults = results.length > 0
        return hasResults ? success(hasResults) : failure(hasResults)
      })
    )
  }
}
