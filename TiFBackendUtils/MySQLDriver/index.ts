import { MySQLDriver } from "./MySQLDriver";
import { DATABASE_NAME, createDatabaseConnection } from "./dbConnection";

export const recreateDatabase = async () => {
  const connection = await createDatabaseConnection({ database: undefined })

  try {
    await connection.query(`DROP DATABASE ${DATABASE_NAME}`)

    await connection.query(`CREATE DATABASE ${DATABASE_NAME}`)

    await connection.changeUser({ database: DATABASE_NAME })

    await connection.end()

    console.log("Reset the database successfully")
  } catch (error) {
    console.error("An error occurred:", error)
  }
}

export type MySQLExecutableDriver = Omit<MySQLDriver, "query" | "execute">
export const conn: MySQLExecutableDriver = new MySQLDriver();
