import dotenv from 'dotenv';
import mysql from "mysql2/promise.js";
import { z } from 'zod';

dotenv.config()

const EnvVarsSchema = z
  .object({
    DATABASE_HOST: z.string(),
    DATABASE_NAME: z.string()
      .min(1, { message: "Database name must be at least 1 character long." })
      .max(16, { message: "Database name must be no more than 16 characters long." })
      .regex(/^[a-zA-Z0-9_]+$/, { message: "Database name must only contain alphanumeric characters and underscores." }),
    DATABASE_PORT: z.string().optional(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_USERNAME: z.string(),
    CA_PEM: z.string().optional(),
  })
  .passthrough()

const envVars = EnvVarsSchema.parse(process.env)

export const DATABASE_NAME = envVars.DATABASE_NAME

export const createDatabaseConnection = async (connectionConfig: Partial<mysql.ConnectionOptions> = {}) => {
  return mysql.createConnection({
    host: envVars.DATABASE_HOST,
    user: envVars.DATABASE_USERNAME,
    port: Number(envVars.DATABASE_PORT),
    password: envVars.DATABASE_PASSWORD,
    database: envVars.DATABASE_NAME,
    timezone: 'Z',
    namedPlaceholders: true,
    decimalNumbers: true,
    //if envVars.CA_PEM does not exist, then we're in a local testing env and don't need to pass that to the connection
    ...(envVars.CA_PEM && {
      ssl: {
        ca: envVars.CA_PEM
      }
    }),
    ...connectionConfig
  });
};

export const recreateDatabase = async () => {
  const connection = await createDatabaseConnection({ database: undefined })

  try {
    await connection.query(`DROP DATABASE ${envVars.DATABASE_NAME}`)

    await connection.query(`CREATE DATABASE ${envVars.DATABASE_NAME}`)

    await connection.changeUser({ database: envVars.DATABASE_NAME })

    console.log("Reset the database successfully")
  } catch (error) {
    console.error("An error occurred:", error)
  }
}