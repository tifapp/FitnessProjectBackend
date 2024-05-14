import dotenv from "dotenv"
import mysql from "mysql2/promise.js"
import { z } from "zod"
import { LocalMySQLExecutableDriver } from "../LocalSQL/LocalMySQLDriver.js"

dotenv.config()

const EnvVarsSchema = z
  .object({
    DATABASE_HOST: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_USERNAME: z.string(),
    DATABASE_NAME: z.string()
  })
  .passthrough()

const envVars = EnvVarsSchema.parse(process.env)

const dbName = "tif"

export const recreateDatabase = async () => {
  const connection = await sqlConn

  try {
    await connection.changeUser({ database: undefined })

    await connection.query(`DROP DATABASE ${dbName}`)

    await connection.query(`CREATE DATABASE ${dbName}`)

    await connection.changeUser({ database: dbName })

    console.log("Reset the database successfully")
  } catch (error) {
    console.error("An error occurred:", error)
  }
}

export async function createDatabaseConnection () {
  try {
    const connection = await mysql.createConnection({
      host: envVars.DATABASE_HOST,
      user: envVars.DATABASE_USERNAME,
      password: envVars.DATABASE_PASSWORD,
      database: envVars.DATABASE_NAME,
      namedPlaceholders: true
    })
    console.log("Successfully connected to the database.")
    return connection
  } catch (error) {
    console.error("Unable to connect to the database:", error)
    throw error
  }
}

export const sqlConn = createDatabaseConnection()
export const conn = new LocalMySQLExecutableDriver(sqlConn)
