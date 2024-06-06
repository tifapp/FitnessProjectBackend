import dotenv from 'dotenv';
import mysql from 'mysql2/promise.js';
import { z } from 'zod';
import { SQLExecutable } from './utils.js';

export { SQLExecutable };

dotenv.config();

const EnvVarsSchema = z.object({
  DATABASE_HOST: z.string(),
  DATABASE_NAME: z.string()
    .min(1, { message: "Database name must be at least 1 character long." })
    .max(16, { message: "Database name must be no more than 16 characters long." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Database name must only contain alphanumeric characters and underscores." }),
  DATABASE_PORT: z.string().optional(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_USERNAME: z.string(),
  CA_PEM: z.string().optional(),
}).passthrough();

const envVars = EnvVarsSchema.parse(process.env);

export const createConnection = async (connectionConfig: Partial<mysql.ConnectionOptions> = {}) => {
  console.log("env vars are ")
  console.log(envVars)

  return mysql.createConnection({
    host: envVars.DATABASE_HOST,
    user: envVars.DATABASE_USERNAME,
    port: Number(envVars.DATABASE_PORT),
    password: envVars.DATABASE_PASSWORD,
    database: envVars.DATABASE_NAME,
    timezone: 'Z',
    namedPlaceholders: true,
    decimalNumbers: true,
    ...(envVars.CA_PEM && {
      ssl: {
        ca: envVars.CA_PEM
      }
    }),
    ...connectionConfig
  });
};

export const conn = new SQLExecutable();

export const recreateDatabase = async () => {
  const connection = await createConnection({database: undefined});

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${envVars.DATABASE_NAME}\``);
    await connection.query(`CREATE DATABASE \`${envVars.DATABASE_NAME}\``);

    console.log(`Reset the database ${envVars.DATABASE_NAME} successfully`);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await connection.end();
  }
};
