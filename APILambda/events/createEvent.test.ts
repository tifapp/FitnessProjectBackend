import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent } from "../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"

describe("CreateEvent tests", () => {
  resetDatabaseBeforeEach()

  it("should allow a user to create an event if the user exists", async () => {
    const userToken = await createUserAndUpdateAuth(global.defaultUser)
    const resp = await callCreateEvent(userToken, testEvents[0])
    expect(resp).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
    expect(parseInt(resp.body.id)).not.toBeNaN()
  })
})
