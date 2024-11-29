import { conn } from "TiFBackendUtils"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { randomUUID } from "crypto"
import { expectFailsCheckConstraint } from "../../TiFBackendUtils/test/MySQLDriver/dbHelpers"
import { testEventInput } from "../test/testEvents"
import { createEventSQL } from "./createEvent"

describe("Insert event CheckConstraint test", () => {
  it("does not allow the end date to be before the start date", async () => {
    await expectFailsCheckConstraint(async () => {
      await createEventSQL(
        conn,
        {
          ...testEventInput,
          ...testEventInput.location.value as LocationCoordinate2D,
          startDateTime: new Date(100000),
          duration: -5
        },
        randomUUID()
      )
    })
  })
})
