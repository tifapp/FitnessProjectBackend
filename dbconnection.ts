import { ExecutedQuery, connect } from "@planetscale/database";
import fetch from "node-fetch";
import { envVars } from "./env.js";
/**
 * The main planet scale connection to use.
 */
export const conn = connect({
  fetch,
  host: envVars.DATABASE_HOST,
  username: envVars.DATABASE_USERNAME,
  password: envVars.DATABASE_PASSWORD,
});

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
  execute(query: string, args?: object | any[] | null): Promise<ExecutedQuery>;
}

/**
 * A helper function that returns if a given sql query has any results.
 */
export const hasResults = async (
  conn: SQLExecutable,
  query: string,
  args: object | any[] | null = null
) => {
  return await conn.execute(query, args).then((res) => res.rows.length > 0);
};

/**
 * Queries
 * @param conn
 * @param query
 * @param args
 * @returns
 */
export const queryResults = async <Value>(
  conn: SQLExecutable,
  query: string,
  args: object | any[] | null = null
) => {
  return await conn.execute(query, args).then((res) => res.rows as Value[]);
};
