import { userNotFoundBody } from "../shared/Responses.js"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent } from "../test/helpers/events.js"
import { callPostUser } from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"

describe("CreateEvent tests", () => {
  resetDatabaseBeforeEach()

  it("does not allow a user to create an event if the user doesn't exist", async () => {
    const resp = await callCreateEvent(global.defaultUser.auth, testEvents[0])
    expect(resp.status).toEqual(401)
    expect(resp.body).toEqual(userNotFoundBody(global.defaultUser.id))
  })

  it("should allow a user to create an event if the user exists", async () => {
    await callPostUser(global.defaultUser.auth)
    const resp = await callCreateEvent(global.defaultUser.auth, testEvents[0])
    expect(resp.status).toEqual(201)
    expect(parseInt(resp.body.id)).not.toBeNaN()
  })
})
