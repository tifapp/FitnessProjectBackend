import "TiFShared"

import { MySQLDriver, MySQLExecutableDriver } from "./MySQLDriver"

// Avoids prototype extension conflict from TiFShared in local tests. TODO: Find a way to remove it and get the tests working in ci
export { TiFAPIClient, TiFAPISchema } from "TiFShared/api"
export { TiFAPIClientCreator } from "TiFShared/api/APIClient"

// WARNING: During tests, connection must be closed after importing, otherwise it causes open handles errors.
export const conn: MySQLExecutableDriver = new MySQLDriver()
