import { randomUUID } from "crypto"
import { userNotFoundBody } from "../shared/Responses.js"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent } from "../test/helpers/events.js"
import { callPostUser } from "../test/helpers/users.js"
import { testEvents, testUserIdentifier } from "../test/testVariables.js"

describe("CreateEvent tests", () => {
  resetDatabaseBeforeEach()

  it("does not allow a user to create an event if the user doesn't exist", async () => {
    const id = randomUUID()
    const resp = await callCreateEvent(id, testEvents[0])
    expect(resp.status).toEqual(404)
    expect(resp.body).toEqual(userNotFoundBody(id))
  })

  it("should allow a user to create an event if the user exists", async () => {
    await callPostUser(testUserIdentifier)
    const resp = await callCreateEvent(testUserIdentifier, testEvents[0])
    expect(resp.status).toEqual(201)
    expect(parseInt(resp.body.id)).not.toBeNaN()
  })
})
