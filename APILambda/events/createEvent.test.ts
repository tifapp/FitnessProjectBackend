import { callCreateEvent } from "../test/apiCallers/events.js"
import { testEvent } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("CreateEvent tests", () => {
  it("should allow a user to create an event if the user exists", async () => {
    const { token } = await createUserFlow()
    const resp = await callCreateEvent(token, testEvent)
    expect(resp).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
    expect(parseInt(resp.body.id)).not.toBeNaN()
  })
})
