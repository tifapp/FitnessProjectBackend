/* eslint-disable import/extensions */

import { resetDB } from "./database"

/*
* Resets database before each test
*/
global.beforeEach(async () => {
  await resetDB()
})

global.beforeAll(resetDB)
