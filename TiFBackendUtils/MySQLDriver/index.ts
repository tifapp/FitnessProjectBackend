import { MySQLDriver } from "./MySQLDriver"

export { MySQLDriver } from "./MySQLDriver"
export type MySQLExecutableDriver = Omit<MySQLDriver, "query" | "execute">
