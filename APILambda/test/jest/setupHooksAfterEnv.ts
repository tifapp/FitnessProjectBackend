import { conn } from "TiFBackendUtils"
import { resetDB } from "TiFBackendUtils/test/MySQLDriver/dbHelpers"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { closeLocalhostServer } from "../localhostListener"
import { restoreDevEnv } from "../devIndex"

global.beforeAll(() =>
  addLogHandler(consoleLogHandler())
)

/*
 * Resets database before each test
 */
global.beforeEach(async () => {
  await resetDB()
})

global.afterEach(() => {
  restoreDevEnv()
  return closeLocalhostServer()
})

global.afterAll(() => conn.closeConnection())
