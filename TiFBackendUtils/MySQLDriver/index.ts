import { MySQLDriver } from "./MySQLDriver";

export type MySQLExecutableDriver = Omit<MySQLDriver, "query" | "execute">
export const conn: MySQLExecutableDriver = new MySQLDriver();
