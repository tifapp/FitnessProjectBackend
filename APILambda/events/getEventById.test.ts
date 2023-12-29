import { randomInt } from "crypto"
import { callCreateEvent, callGetEvent } from "../test/apiCallers/events.js"
import { createUserFlow } from "../test/userFlows/users.js"
import { testEvent } from "../test/testEvents.js"

describe("GetSingleEvent tests", () => {
  it("should return 404 if the event doesnt exist", async () => {
    const { token } = await createUserFlow()
    const eventId = randomInt(1000)
    const resp = await callGetEvent(token, eventId)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" }
    })
  })

  it("should return event details if the event exists", async () => {
    const { token } = await createUserFlow()
    const startTimestamp = new Date("2050-01-01")
    const endTimestamp = new Date("2050-01-02")
    const createEventResponse = await callCreateEvent(token, { ...testEvent, startTimestamp, endTimestamp })
    const resp = await callGetEvent(token, createEventResponse.body.id)

    expect(resp).toMatchObject({
      status: 200,
      body: {
        title: testEvent.title,
        description: testEvent.description,
        startTimestamp: startTimestamp.toISOString(),
        endTimestamp: endTimestamp.toISOString(),
        latitude: testEvent.latitude,
        longitude: testEvent.longitude
      }
    })
  })
})
