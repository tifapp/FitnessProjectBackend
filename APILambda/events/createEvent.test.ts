import { userNotFoundBody } from "../shared/Responses.js"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent } from "../test/helpers/events.js"
import { callPostUser } from "../test/helpers/users.js"
import { mockClaims, testEvents, testAuthorizationHeader } from "../test/testVariables.js"

describe("CreateEvent tests", () => {
  resetDatabaseBeforeEach()

  it("does not allow a user to create an event if the user doesn't exist", async () => {
    const resp = await callCreateEvent(testAuthorizationHeader, testEvents[0])
    expect(resp.status).toEqual(401)
    expect(resp.body).toEqual(userNotFoundBody(mockClaims.sub))
  })

  it("should allow a user to create an event if the user exists", async () => {
    await callPostUser(testAuthorizationHeader)
    const resp = await callCreateEvent(testAuthorizationHeader, testEvents[0])
    expect(resp.status).toEqual(201)
    expect(parseInt(resp.body.id)).not.toBeNaN()
  })
})
