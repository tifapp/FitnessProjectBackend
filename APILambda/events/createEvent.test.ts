import { callCreateEvent } from "../test/apiCallers/events.js"
import { testEvent } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("CreateEvent tests", () => {
  it("should allow a user to create an event", async () => {
    const { token } = await createUserFlow()
    const resp = await callCreateEvent(token, testEvent)
    expect(resp).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
    expect(parseInt(resp.body.id)).not.toBeNaN()
  })

  it("should not allow a user to create an event that ends in the past", async () => {
    const { token } = await createUserFlow()
    const resp = await callCreateEvent(token, { ...testEvent, startTimestamp: new Date("2000-01-01"), endTimestamp: new Date("2000-01-02") })
    expect(resp).toMatchObject({
      status: 400,
      body: { error: "invalid-request" }
    })
  })
})
