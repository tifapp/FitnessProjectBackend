import { conn } from "TiFBackendUtils"
import { resetDB } from "TiFBackendUtils/MySQLDriver/test/dbHelpers"
import { addLogHandler, consoleLogHandler } from "TiFShared/logging"
import { testUserCounter } from "../userFlows/createUserFlow"
import { closeServer } from "../.."

global.beforeAll(() => addLogHandler(consoleLogHandler()))

/*
 * Resets database before each test
 */
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()
})

global.beforeAll(resetDB)

global.afterEach(closeServer)

global.afterAll(() => conn.closeConnection())
