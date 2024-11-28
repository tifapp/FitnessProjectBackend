import { conn } from "TiFBackendUtils/MySQLDriver"
import { randomUUID } from "crypto"
import { expectFailsCheckConstraint } from "../../../TiFBackendUtils/test/MySQLDriver/dbHelpers"
import { insertUser } from "./createUserProfile"

describe("CheckConstraint tests", () => {
  it("should not allow a handle with non-lowercase alpha numeric characters", async () => {
    await expectFailsCheckConstraint(async () => {
      await insertUser(conn, {
        id: randomUUID(),
        name: "test",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handle: "(*(*&(SJK" as any
      })
    })
  })

  it("should not allow an empty handle", async () => {
    await expectFailsCheckConstraint(async () => {
      await insertUser(conn, {
        id: randomUUID(),
        name: "test",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handle: "" as any
      })
    })
  })
})
