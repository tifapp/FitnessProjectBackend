import { conn } from "TiFBackendUtils"
import { randomUUID } from "crypto"
import { expectFailsCheckConstraint } from "../../TiFBackendUtils/MySQLDriver/test/utils.js"
import { testEventInput } from "../test/testEvents.js"
import { createEvent } from "./createEvent.js"

describe("Insert event CheckConstraint test", () => {
  it("does not allow the end date to be before the start date", async () => {
    await expectFailsCheckConstraint(async () => {
      await createEvent(
        conn,
        {
          ...testEventInput,
          startDateTime: new Date(1000),
          endDateTime: new Date(0)
        },
        randomUUID()
      )
    })
  })
})
