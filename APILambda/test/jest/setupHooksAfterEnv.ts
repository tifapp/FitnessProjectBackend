import { conn } from "TiFBackendUtils"
import { resetDB } from "TiFBackendUtils/test/MySQLDriver/dbHelpers"
import { closeLocalhostServer } from "../localhostListener"
import { testEventCoordinate } from "../testEvents"
import { testUserCounter } from "../userFlows/createUserFlow"

/*
 * Resets database before each test
 */
global.beforeEach(async () => {
  testUserCounter.currentUserIndex = 0
  await resetDB()

  await addLocationToDB(
    conn,
    {
      ...testEventCoordinate,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      streetNumber: "1234"
    },
    "Asia/Shanghai"
  )
})

global.afterEach(closeLocalhostServer)

global.afterAll(() => conn.closeConnection())
