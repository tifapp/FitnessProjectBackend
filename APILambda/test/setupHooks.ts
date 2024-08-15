/* eslint-disable import/extensions */
import "TiFShared"

import { resetDB } from "TiFBackendUtils/MySQLDriver/test/utils"
import { testUserCounter } from "./userFlows/createUserFlow"

console.log("LETS GO")

/*
* Resets database before each test
*/
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()
})

global.beforeAll(resetDB)
