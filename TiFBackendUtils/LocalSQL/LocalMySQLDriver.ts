import { ResultSetHeader, RowDataPacket } from "mysql2"
import mysql from "mysql2/promise.js"
import { ExecuteResult, SQLDriverAbstract } from "../SQLExecutable/SQLDriverAbstract.js"
import { AwaitableResult, promiseResult } from "../result.js"

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

export class LocalMySQLExecutableDriver extends SQLDriverAbstract {
  private conn: Promise<mysql.Connection>

  constructor (connection: Promise<mysql.Connection>) {
    super()
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
    args: object | null = null
  ): Promise<ExecuteResult> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    console.log("trying execution")
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
   * Performs an idempotent transaction and returns the result of the transaction wrapped in a {@link PromiseResult}.
   */
  transaction<SuccessValue, ErrorValue> (
    querySQLTransaction: (tx: SQLDriverAbstract) => AwaitableResult<SuccessValue, ErrorValue>
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
    args: object | null
  ): Promise<Value[]> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const conn = await this.conn
    const [rows] = await conn.query(query, args)
    if (Array.isArray(rows)) {
      return castTypes(rows as RowDataPacket[]) as Value[]
    } else {
      throw new Error("Query did not return an array of rows.")
    }
  }
}
