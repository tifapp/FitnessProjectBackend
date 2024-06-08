import { resetDB } from "../APILambda/test/database.ts";
import { conn } from "../TiFBackendUtils/index.ts";

if (process.argv.includes('--run')) {
    await resetDB()
    conn.closeConnection()
}