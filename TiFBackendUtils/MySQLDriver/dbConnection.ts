import type { ConnectionOptions } from "mysql2/promise"
import { envVars } from "../env"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mysql = require("mysql2/promise")

export const createDatabaseConnection = async (connectionConfig: Partial<ConnectionOptions> = {}) => {
  return mysql.createConnection({
    host: envVars.DATABASE_HOST,
    user: envVars.DATABASE_USERNAME,
    port: Number(envVars.DATABASE_PORT),
    password: envVars.DATABASE_PASSWORD,
    database: envVars.DATABASE_NAME,
    timezone: "Z",
    namedPlaceholders: true,
    decimalNumbers: true,
    // if envVars.CA_PEM does not exist, then we're in a local testing env and don't need to pass that to the connection
    ...(envVars.CA_PEM && {
      ssl: {
        ca: envVars.CA_PEM
      }
    }),
    ...connectionConfig
  })
}
