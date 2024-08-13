import { resetDB } from "../TiFBackendUtils/MySQLDriver/test/utils.ts"

if (process.argv.includes("--run")) {
  await resetDB()
}
