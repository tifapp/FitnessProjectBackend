import { ResultSetHeader, RowDataPacket } from "mysql2"
import mysql, { FieldPacket } from "mysql2/promise.js"
import { AwaitableResult, failure, promiseResult, success } from "../result.js"

type ExecuteResult = {
  insertId: string
  rowsAffected: number
}

const isResultSetHeader = (result: ResultSetHeader): result is ResultSetHeader => {
  return "insertId" in result && "affectedRows" in result
}

const typecasts: Record<number, (value: string | null) => unknown> = {
  3: (value) => parseInt(value ?? "0") > 0, // INT or LONG as BOOLEAN
  1: (value) => parseInt(value ?? "0") > 0, // TINYINT as BOOLEAN
  7: (value) => value ? new Date(value) : value, // TIMESTAMP
  12: (value) => value ? new Date(value) : value, // DATETIME
  246: (value) => value ? parseFloat(value) : value // NEWDECIMAL (DECIMAL/NUMERIC)
}

const castTypes = (rows: RowDataPacket[], fields: FieldPacket[]): RowDataPacket[] => {
  return rows.map(row => {
    console.log("row ", row)
    fields.forEach(field => {
      console.log("field ", field)
      const type = field.type
      const key = field.name
      if (type !== undefined && typecasts[type]) {
        row[key] = typecasts[type](row[key])
      }
    })
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
    args: object | (number | string)[] | null = null
  ): Promise<Value[]> {
    const conn = await this.conn
    const [rows, fields] = await conn.query(query, args)
    if (Array.isArray(rows) && Array.isArray(fields)) {
      return castTypes(rows as RowDataPacket[], fields) as Value[]
    } else {
      throw new Error("Query did not return an array of rows and fields.")
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
