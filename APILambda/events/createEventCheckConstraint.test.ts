import { conn } from "TiFBackendUtils"
import { randomUUID } from "crypto"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "../test/database.js"
import { testEvents } from "../test/testEvents.js"
import { createEvent } from "./createEvent.js"

describe("Insert event CheckConstraint test", () => {
  resetDatabaseBeforeEach()
  it("does not allow the end date to be before the start date", async () => {
    await expectFailsCheckConstraint(async () => {
      await createEvent(
        conn,
        {
          ...testEvents[0],
          startTimestamp: new Date(1000),
          endTimestamp: new Date(0)
        },
        randomUUID()
      )
    })
  })
})