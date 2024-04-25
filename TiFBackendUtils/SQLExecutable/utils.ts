/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Replace with backend utils
import { BeginTransactionCommand, CommitTransactionCommand, ExecuteStatementCommand, Field, RDSDataClient, RollbackTransactionCommand, SqlParameter } from "@aws-sdk/client-rds-data"
import { envVars } from "../Planetscale/env.js"
import { AnyResult, PromiseResult, failure, promiseResult, success } from "../result.js"

const dbEnv = {
  resourceArn: "arn:aws:rds:region:accountId:cluster:clusterIdentifier", // Your cluster ARN (use env)
  secretArn: "arn:aws:secretsmanager:region:accountId:secret:secretName", // Your secret ARN for database credentials (use env)
  database: envVars.DATABASE_NAME
}

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
  private client: RDSDataClient

  constructor (client: RDSDataClient) {
    this.client = client
  }

  private async execute<Value> (sql: string, args: object | null = null): Promise<Value[]> {
    const parameters: SqlParameter[] = args
      ? Object.entries(args).map(([key, value]) => {
      // Determine the type of the value to assign the correct field (e.g., stringValue, blobValue, etc.)
        let paramValue: Field
        if (typeof value === "string") {
          paramValue = { stringValue: value }
        } else if (typeof value === "number") {
          paramValue = Number.isInteger(value) ? { longValue: value } : { doubleValue: value }
        } else if (typeof value === "boolean") {
          paramValue = { booleanValue: value }
        } else if (value instanceof Buffer) {
          paramValue = { blobValue: value }
        } else {
          throw new Error(`Unsupported type for parameter ${key}`)
        }

        return { name: key, value: paramValue }
      })
      : []

    const command = new ExecuteStatementCommand({
      ...dbEnv,
      sql,
      parameters
    })

    const result = await this.client.send(command)
    return result.records as Value[]
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

  private async executeAndReturnQueryResult (sql: string, args: object | null = null): Promise<QueryResult> {
    const parameters: SqlParameter[] = args
      ? Object.entries(args).map(([key, value]) => {
      // Determine the type of the value to assign the correct field (e.g., stringValue, blobValue, etc.)
        let paramValue: Field
        if (typeof value === "string") {
          paramValue = { stringValue: value }
        } else if (typeof value === "number") {
          paramValue = Number.isInteger(value) ? { longValue: value } : { doubleValue: value }
        } else if (typeof value === "boolean") {
          paramValue = { booleanValue: value }
        } else if (value instanceof Buffer) {
          paramValue = { blobValue: value }
        } else {
          throw new Error(`Unsupported type for parameter ${key}`)
        }

        return { name: key, value: paramValue }
      })
      : []

    const command = new ExecuteStatementCommand({
      ...dbEnv,
      sql,
      parameters
    })

    const result = await this.client.send(command)

    return { rowsAffected: result.numberOfRecordsUpdated ?? 0, insertId: `${result.generatedFields?.map(field => field.longValue)[0]}` ?? "" }
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
  // transaction<SuccessValue, ErrorValue> (
  //   query: (tx: SQLExecutable) => AwaitableResult<SuccessValue, ErrorValue>
  // ) {
  //   return promiseResult(this.transaction(async () => query(this)))
  // }

  private beginTransaction (): PromiseResult<string, void> {
    return promiseResult(
      this.client.send(new BeginTransactionCommand({
        ...dbEnv
      })).then(response => response.transactionId ? success(response.transactionId) : failure())
    )
  }

  private endTransaction (transactionId: string): PromiseResult<void, Error> {
    return promiseResult(this.client.send(new CommitTransactionCommand({
      ...dbEnv,
      transactionId
    }))
      .then(() => success())
      .catch(error => failure(error))
    )
  }

  private rollbackTransaction (transactionId: string, error: unknown): PromiseResult<never, unknown> {
    return promiseResult(
      this.client.send(new RollbackTransactionCommand({
        ...dbEnv,
        transactionId
      })).then(() => failure(error))
    )
  }

  transaction<SuccessValue, ErrorValue> (
    query: (tx: SQLExecutable) => AnyResult<SuccessValue, ErrorValue>
  ) {
    return this.beginTransaction()
      .flatMapSuccess(transactionId =>
        query(this)
          .flatMapSuccess(
            (successValue) => this.endTransaction(transactionId).mapSuccess(() => successValue)
          ).flatMapFailure(error => this.rollbackTransaction(transactionId, error))
      ).mapFailure(
        error => error
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
