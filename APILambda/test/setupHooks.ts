/* eslint-disable import/extensions */
import { resetDB } from "../../scripts/resetDB"
import { testUserCounter } from "./userFlows/users"

/*
* Resets database before each test
*/
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()
})

global.beforeAll(resetDB)