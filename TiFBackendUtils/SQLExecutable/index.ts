import dotenv from "dotenv"
import mysql from "mysql2/promise.js"
import { z } from "zod"
import { SQLExecutable } from "./utils.js"
export { SQLExecutable }

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

async function createDatabaseConnection () {
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

export const conn = new SQLExecutable(createDatabaseConnection())
