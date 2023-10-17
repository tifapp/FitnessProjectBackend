import { conn } from "TiFBackendUtils"
import { insertUser } from "../user/index.js"
import { resetDatabaseBeforeEach, expectFailsCheckConstraint } from "./database.js"
import { testUsers } from "./testVariables.js"

describe("CheckConstraint tests", () => {
  resetDatabaseBeforeEach()
  it("should not allow a handle with non-lowercase alpha numeric characters", async () => {
    await expectFailsCheckConstraint(async () => {
      await insertUser(conn,
        {
          ...testUsers[0],
          handle: "(*(*&(SJK"
        }
      )
    })
  })

  it("should not allow an empty handle", async () => {
    await expectFailsCheckConstraint(async () => {
      await insertUser(conn, {
        ...testUsers[0],
        handle: ""
      })
    })
  })
})
