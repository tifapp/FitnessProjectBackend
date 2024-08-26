import { resetDB } from "../TiFBackendUtils/MySQLDriver/test/utils"

if (process.argv.includes("--run")) {
  resetDB()
}
