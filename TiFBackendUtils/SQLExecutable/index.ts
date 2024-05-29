import dotenv from 'dotenv';
import mysql from 'mysql2/promise.js';
import { z } from 'zod';
import { SQLExecutable } from './utils.js';

export { SQLExecutable };

dotenv.config();

const EnvVarsSchema = z.object({
  DATABASE_HOST: z.string(),
  DATABASE_NAME: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_USERNAME: z.string(),
}).passthrough();

const envVars = EnvVarsSchema.parse(process.env);

let connection: mysql.Connection;

const createConnection = async (connectionConfig: Partial<mysql.ConnectionOptions> = {database: envVars.DATABASE_NAME}) => {
  return mysql.createConnection({
    host: envVars.DATABASE_HOST,
    user: envVars.DATABASE_USERNAME,
    password: envVars.DATABASE_PASSWORD,
    database: undefined,
    timezone: 'Z',
    namedPlaceholders: true,
    decimalNumbers: true,
    ...connectionConfig
  });
};

const useConnection = async () => {
  if (!connection) {
    connection = await createConnection();
  }

  try {
    await connection.ping();
    console.log('Connection is still alive');
  } catch (error) {
    console.log('Connection lost, creating a new one');
    connection = await createConnection();
  }

  return connection;
};

export const conn = new SQLExecutable(useConnection);

export const recreateDatabase = async () => {
  const connection = await createConnection({database: undefined});

  try {
    console.log(`Going to reset the database ${envVars.DATABASE_NAME}`);

    await connection.query(`DROP DATABASE IF EXISTS \`${envVars.DATABASE_NAME}\``);
    await connection.query(`CREATE DATABASE \`${envVars.DATABASE_NAME}\``);

    console.log('Reset the database successfully');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await connection.end();
  }
};
