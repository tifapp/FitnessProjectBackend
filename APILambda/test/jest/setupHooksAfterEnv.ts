import { conn } from "TiFBackendUtils"
import { resetDB } from "TiFBackendUtils/test/MySQLDriver/dbHelpers"
import { closeLocalhostServer } from "../localhostListener"
import { testUserCounter } from "../userFlows/createUserFlow"

/*
 * Resets database before each test
 */
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()
})

global.afterEach(closeLocalhostServer)

global.afterAll(() => conn.closeConnection())
