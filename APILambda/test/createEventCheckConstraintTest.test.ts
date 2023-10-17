import { conn } from "TiFBackendUtils"
import { randomUUID } from "crypto"
import { insertEvent } from "../events/index.js"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "./database.js"
import { testEvents } from "./testVariables.js"

describe("Insert event CheckConstraint test", () => {
  resetDatabaseBeforeEach()
  it("does not allow the end date to be before the start date", async () => {
    await expectFailsCheckConstraint(async () => {
      await insertEvent(
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
