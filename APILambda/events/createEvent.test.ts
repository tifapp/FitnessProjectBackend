import { randomUUID } from "crypto"
import { userNotFoundBody } from "../shared/Responses"
import { resetDatabaseBeforeEach } from "../test/database"
import { callCreateEvent } from "../test/helpers/events"
import { callPostUser } from "../test/helpers/users"
import { testEvents, testUserIdentifier } from "../test/testVariables"

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
