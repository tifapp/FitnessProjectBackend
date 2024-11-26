import { resetDB } from "../TiFBackendUtils/test/MySQLDriver/dbHelpers"

if (process.argv.includes("--run")) {
  resetDB()
}
