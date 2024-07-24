import { MySQLDriver } from "./MySQLDriver.js"

export type MySQLExecutableDriver = Omit<MySQLDriver, "query" | "execute">
export const conn: MySQLExecutableDriver = new MySQLDriver()
