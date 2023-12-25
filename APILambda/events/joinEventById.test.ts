import { randomInt } from "crypto"
import { callCreateEvent, callJoinEvent } from "../test/apiCallers/events.js"
import {
  callBlockUser
} from "../test/apiCallers/users.js"
import { testEvent } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Join the event by id tests", () => {
  it("should return 201 when the user is able to successfully join the event", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 201,
      body: { id: attendeeId, token: expect.anything() }
    })
  })

  it("should return 403 when the user is blocked by the event host", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    await callBlockUser(eventOwnerToken, attendeeId)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 403,
      body: { error: "user-is-blocked" }
    })
  })

  it("should return 404 if the event doesn't exist", async () => {
    const { token: attendeeToken } = await createUserFlow()
    const eventId = randomInt(1000)
    const resp = await callJoinEvent(attendeeToken, eventId)
    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" } // will need to add some middleware similar to auth middleware to assert event exists
    })
  })

  it("should return 403 when the event has ended", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken } = await createUserFlow()

    const currentDate = new Date()
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2050-01-01"))

    const event = await callCreateEvent(eventOwnerToken, { ...testEvent, endTimestamp: currentDate })
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-ended" }
    })

    jest.useRealTimers()
  })

  it("should return 200 when the user tries to join an event twice", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    await callJoinEvent(attendeeToken, parseInt(event.body.id))
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 200,
      body: { id: attendeeId, token: expect.anything() } // should be event id?
    })
  })
})
