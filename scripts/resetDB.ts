import { resetDB } from "../TiFBackendUtils/MySQLDriver/test/utils.ts"
import { conn } from "../TiFBackendUtils/index.ts"

if (process.argv.includes("--run")) {
  await resetDB()
  conn.closeConnection()
}
