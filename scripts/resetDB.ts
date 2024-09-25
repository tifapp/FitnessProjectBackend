import { resetDB } from "../TiFBackendUtils/MySQLDriver/test/dbHelpers"

if (process.argv.includes("--run")) {
  resetDB()
}
