import { resetDB } from "../TiFBackendUtils/MySQLDriver/test/utils";

/*
* Resets database before each test
*/
global.beforeEach(async () => {
  await resetDB()
})

global.beforeAll(resetDB)
