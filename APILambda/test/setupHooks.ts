/* eslint-disable import/extensions */
import { resetDB } from "./database"
import { testUserCounter } from "./userFlows/users"

/*
* Resets database before each test
*/
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()
})
