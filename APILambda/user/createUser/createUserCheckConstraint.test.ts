import { conn, expectFailsCheckConstraint } from "TiFBackendUtils"
import { randomUUID } from "crypto"
import { insertUser } from "./createUserProfile.js"

describe("CheckConstraint tests", () => {
  it("should not allow a handle with non-lowercase alpha numeric characters", async () => {
    await expectFailsCheckConstraint(async () => {
      await insertUser(conn,
        {
          id: randomUUID(),
          name: "test",
          handle: "(*(*&(SJK"
        }
      )
    })
  })

  it("should not allow an empty handle", async () => {
    await expectFailsCheckConstraint(async () => {
      await insertUser(conn, {
        id: randomUUID(),
        name: "test",
        handle: ""
      })
    })
  })
})
