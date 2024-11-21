import { conn } from "TiFBackendUtils"
import { resetDB } from "TiFBackendUtils/MySQLDriver/test/dbHelpers"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { closeLocalhostServer } from "../localhostListener"
import { testUserCounter } from "../userFlows/createUserFlow"

global.beforeAll(() => addLogHandler(consoleLogHandler()))

/*
 * Resets database before each test
 */
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()
})

global.beforeAll(resetDB)

global.afterEach(closeLocalhostServer)

global.afterAll(() => conn.closeConnection())
