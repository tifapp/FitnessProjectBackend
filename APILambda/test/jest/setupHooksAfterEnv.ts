import { conn } from "TiFBackendUtils"
import { resetDB } from "TiFBackendUtils/MySQLDriver/test/dbHelpers"
import { testUserCounter } from "../userFlows/createUserFlow"

/*
* Resets database before each test
*/
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()
})

global.beforeAll(resetDB)

global.afterAll(() => conn.closeConnection())
