/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Replace with backend utils
import { PromiseResult, failure, promiseResult, success } from "TiFShared/lib/Result.js"
import mysql, { FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise.js"
import { createDatabaseConnection } from "./dbConnection.js"

export type DBExecution = {
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
    fields.forEach(field => {
      const type = field.type
      const key = field.name
      if (type !== undefined && typecasts[type]) {
        row[key] = typecasts[type](row[key])
      }
    })
    return row
  })
}

class MySQLConnectionHandler {
  private connection?: mysql.Connection
  private isConnectionClosed: boolean = false
  
  async useConnection () {
    if (this.isConnectionClosed) {
      throw new Error("Current connection instance was ended.")
    }

    try {
      if (!this.connection) {
        throw new Error("Connection is closed")
      }
        
      await this.connection?.ping();
    } catch (error) {
      console.error(`${error}, making new connection`)
      this.connection = await createDatabaseConnection();
    }

    return this.connection!;
  }
  
  async closeConnection () {
    if (!this.isConnectionClosed) {
      const conn = await this.useConnection()
      conn.end()
      this.isConnectionClosed = true;
    }
  }
}

export class MySQLDriver {
  private connectionHandler = new MySQLConnectionHandler()

  async closeConnection () {
    await this.connectionHandler.closeConnection()
  }

  // ==================
  // Implementation-Dependent Methods
  // ==================
  
  /**
   * Executes a write statement and returns the insert id and # rows affected
   *
   * @example
   * ```ts
   * type User = { id: string, ... }
   *
   * const results = await execute<User>(conn, "INSERT user");
   * console.log(results[0].id) // ✅ Typesafe
   * ```
   */
  private async execute (
    query: string,
    args: object | (number | string)[] | null = null
  ): Promise<DBExecution> {
    // Use this.conn to execute the query and return the result rows
    // This will be the only function to directly use the database library's execute method.
    const conn = await this.connectionHandler.useConnection()
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
   * Loads a list of results from the database given a sql query and casts the result to `Value`
   *
   * @example
   * ```ts
   * type User = { id: string, ... }
   *
   * const results = await query<User>(conn, "SELECT * FROM user");
   * console.log(results[0].id) // ✅ Typesafe
   * ```
   */

  private async query<Value> (
    query: string,
    args: object | (number | string)[] | null = null
  ): Promise<Value[]> {
    const conn = await this.connectionHandler.useConnection()
    const [rows, fields] = await conn.query(query, args)
    if (Array.isArray(rows) && Array.isArray(fields)) {
      return castTypes(rows as RowDataPacket[], fields) as Value[]
    } else {
      throw new Error("Query did not return an array of rows and fields.")
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
    query: (tx: Omit<MySQLDriver, "query" | "execute">) => PromiseResult<SuccessValue, ErrorValue>
  ) {
    return promiseResult((async () => {
      const conn = await this.connectionHandler.useConnection()
      try {
        await conn.beginTransaction()
        const result = await query(this)
        await conn.commit()
        return result
      } catch (error) {
        await conn.rollback()
        throw error
      }
    })())
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

// Usage
// const dbConnection = ...;  // Initialize or import your database connection
// const sqlExec = new SQLExecutable(dbConnection);
// sqlExec.queryHasResults("SELECT * FROM users");
