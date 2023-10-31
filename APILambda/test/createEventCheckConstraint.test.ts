import { conn } from "TiFBackendUtils"
import { randomUUID } from "crypto"
import { createEvent } from "../events/createEvent.js"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "./database.js"
import { testEvents } from "./testEvents.js"

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
