/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Replace with backend utils
import { ExecutedQuery, Field, cast, connect } from "@planetscale/database"
import fetch from "node-fetch"
import { envVars } from "./env.js"

/**
 * A cast function that turns all INT8 types into booleans.
 * This exists solely because of the tinyint type in MySQL.
 */
export const int8ToBoolCast = (field: Field, value: string | null) => {
  if (field.type === "INT8") {
    return parseInt(value ?? "0") > 0
  }
  return cast(field, value)
}

/**
 * Blessed
 */
export const tiFCast = (field: Field, value: string | null) => {
  if (field.type === "INT8") {
    return parseInt(value ?? "0") > 0
  } else if (field.type === "DATETIME" && value) {
    return new Date(value)
  } else if (field.type === "DECIMAL" && value) {
    return parseFloat(value)
  } else {
    return cast(field, value)
  }
}

/**
 * The main planet scale connection to use.
 */
export const conn = connect({
  fetch,
  cast: tiFCast, // NB: Should we use this as the global caster?
  host: envVars.DATABASE_HOST,
  username: envVars.DATABASE_USERNAME,
  password: envVars.DATABASE_PASSWORD
})

/**
 * An interface for abstracting away sql queries from planetscale.
 *
 * It turns out that all ways of executing a planetscale query (conn, transaction, etc.)
 * all share the same interface, but yet the library for some reason chooses not to export this...
 *
 * This interface allows for isolated query functions to be made and used in different contexts,
 * transaction or not.
 */
export interface SQLExecutable {
  execute(query: string, args?: object | any[] | null): Promise<ExecutedQuery>
}

/**
 * A helper function that returns if a given sql query has any results.
 */
export const hasResults = async (
  conn: SQLExecutable,
  query: string,
  args: object | any[] | null = null
) => {
  return await conn.execute(query, args).then((res) => res.rows.length > 0)
}

/**
 * Loads a list of results from the database given a sql query and casts the result to `Value`.
 *
 * @example
 * ```ts
 * type User = { id: string, ... }
 *
 * const results = await queryResults<User>(conn, "SELECT * FROM user");
 * console.log(results[0].id) // ✅ Typesafe
 * ```
 */
export const queryResults = async <Value>(
  conn: SQLExecutable,
  query: string,
  args: object | any[] | null = null
) => {
  return await conn.execute(query, args).then((res) => res.rows as Value[])
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
export const queryFirst = async <Value>(
  conn: SQLExecutable,
  query: string,
  args: object | any[] | null = null
) => {
  return await conn.execute(query, args).then((res) => {
    // NB: We'll cast this to undefined because that's what js likes to do without telling us...
    return res.rows[0] as Value | undefined
  })
}

/**
 * Gets the id of the last inserted record.
 * Every return type from this function will be a string and then it can be parsed afterwards.
 *
 * @param conn planetscale connection
 * @returns the id of the last inserted record
 */
export const selectLastInsertionId = async (conn: SQLExecutable) => {
  const result = await queryFirst<{ "LAST_INSERT_ID()": string }>(
    conn,
    "SELECT LAST_INSERT_ID()"
  )
  return result?.["LAST_INSERT_ID()"]
}

/**
 * Gets the id of the last inserted record and then attempts to return the result parsed as an int.
 *
 * @param conn planetscale connection
 * @returns the id of the last inserted record parsed as an int
 */
export const selectLastInsertionNumericId = async (conn: SQLExecutable) => {
  const id = await selectLastInsertionId(conn)
  if (!id) return undefined
  return parseInt(id)
}
