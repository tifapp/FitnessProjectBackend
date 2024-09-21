import "TiFShared/lib/Math"
import "TiFShared/lib/Zod"

import { MySQLDriver, MySQLExecutableDriver } from "./MySQLDriver"

// WARNING: During tests, connection must be closed after importing, otherwise it causes open handles errors.
export const conn: MySQLExecutableDriver = new MySQLDriver()
