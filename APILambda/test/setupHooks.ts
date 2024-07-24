/* eslint-disable import/extensions */
import { resetDB } from "TiFBackendUtils/MySQLDriver/test/utils"
import { testUserCounter } from "./userFlows/createUserFlow"

/*
* Resets database before each test
*/
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()
})

global.beforeAll(resetDB)