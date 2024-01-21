import { conn } from "TiFBackendUtils"
import { randomInt } from "crypto"
import dayjs from "dayjs"
import { callCreateEvent, callJoinEvent } from "../test/apiCallers/events.js"
import {
  callBlockUser
} from "../test/apiCallers/users.js"
import { testEvent } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"
import { createEvent } from "./createEvent.js"

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
    const { userId: eventOwnerId } = await createUserFlow()
    const { token: attendeeToken } = await createUserFlow()

    // normally we can't create events in the past so we'll add this ended event to the table directly
    const { value: { insertId: eventId } } = await createEvent(conn, {
      ...testEvent,
      startTimestamp: dayjs().subtract(2, "month").toDate(),
      endTimestamp: dayjs().subtract(1, "month").toDate()
    }, eventOwnerId)

    const resp = await callJoinEvent(attendeeToken, Number(eventId))

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-ended" }
    })
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
