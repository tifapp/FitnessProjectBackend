import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent } from "../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"

describe("CreateEvent tests", () => {
  resetDatabaseBeforeEach()

  it("should allow a user to create an event", async () => {
    const userToken = await createUserAndUpdateAuth(global.defaultUser)
    const resp = await callCreateEvent(userToken, testEvents[0])
    expect(resp).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
    expect(parseInt(resp.body.id)).not.toBeNaN()
  })

  it("should not allow a user to create an event that ends in the past", async () => {
    const userToken = await createUserAndUpdateAuth(global.defaultUser)
    const resp = await callCreateEvent(userToken, { ...testEvents[0], startTimestamp: new Date("2000-01-01"), endTimestamp: new Date("2000-01-02") })
    expect(resp).toMatchObject({
      status: 400,
      body: { error: "invalid-request" }
    })
  })
})
