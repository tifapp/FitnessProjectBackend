import { resetDB } from "../TiFBackendUtils/MySQLDriver/test/utils.js";

/*
* Resets database before each test
*/
global.beforeEach(async () => {
  await resetDB()
})

global.beforeAll(resetDB)
