import { randomInt } from "crypto"
import { callCreateEvent, callGetEvent } from "../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"

describe("GetSingleEvent tests", () => {
  it("should return 404 if the event doesnt exist", async () => {
    const token = await createUserAndUpdateAuth(global.defaultUser)
    const eventId = randomInt(1000)
    const resp = await callGetEvent(token, eventId)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" }
    })
  })

  it("should return event details if the event exists", async () => {
    const token = await createUserAndUpdateAuth(global.defaultUser)
    const startTimestamp = new Date("2050-01-01")
    const endTimestamp = new Date("2050-01-02")
    const createEventResponse = await callCreateEvent(token, { ...testEvents[0], startTimestamp, endTimestamp })
    const resp = await callGetEvent(token, createEventResponse.body.id)

    expect(resp).toMatchObject({
      status: 200,
      body: {
        title: testEvents[0].title,
        description: testEvents[0].description,
        startTimestamp: startTimestamp.toISOString(),
        endTimestamp: endTimestamp.toISOString(),
        latitude: testEvents[0].latitude,
        longitude: testEvents[0].longitude
      }
    })
  })
})
