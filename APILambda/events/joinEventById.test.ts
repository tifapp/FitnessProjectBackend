import { conn } from "TiFBackendUtils"
import { randomInt } from "crypto"
import dayjs from "dayjs"
import { callCreateEvent, callGetAttendees, callJoinEvent, callJoinEventWithArrival } from "../test/apiCallers/events.js"
import {
  callBlockUser
} from "../test/apiCallers/users.js"
import { testEventInput } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"
import { createEvent } from "./createEvent.js"

// CHECK ATTENDEES LIST IN AT LEAST ONE TEST

describe("Join the event by id tests", () => {
  it("should not save arrival when the user passes a location but they aren't eligible to join the event", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEventInput)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 201,
      body: { id: attendeeId, token: expect.anything(), isArrived: false, upcomingRegions: expect.anything() }
    })
  })

  it("should not save arrival when the user passes a location and its outdated", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEventInput)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 201,
      body: { id: attendeeId, token: expect.anything(), isArrived: false, upcomingRegions: expect.anything() }
    })
  })

  it("should save arrival when the user passes a location and save to attendees list", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, { ...testEventInput })
    const resp = await callJoinEventWithArrival(attendeeToken, parseInt(event.body.id), { region: { arrivalRadiusMeters: 0, coordinate: { latitude: testEventInput.latitude, longitude: testEventInput.longitude } } })
    expect(resp).toMatchObject({
      status: 201,
      body: { id: attendeeId, token: expect.anything(), isArrived: true, upcomingRegions: expect.anything() }
    })

    const attendeesResp = await callGetAttendees(
      attendeeToken,
      parseInt(event.body.id),
      2
    )

    expect(attendeesResp).toMatchObject({
      status: 200,
      body: {
        attendees: expect.arrayContaining([
          expect.objectContaining({
            id: attendeeId,
            arrivalStatus: true
          })
        ])
      }
    })
  })

  it("should return 201 when the user is able to successfully join the event and save to attendees list", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEventInput)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 201,
      body: { id: attendeeId, token: expect.anything() }
    })

    const attendeesResp = await callGetAttendees(
      attendeeToken,
      parseInt(event.body.id),
      2
    )

    expect(attendeesResp).toMatchObject({
      status: 200,
      body: {
        attendees: expect.arrayContaining([
          expect.objectContaining({
            id: attendeeId,
            arrivalStatus: false
          })
        ])
      }
    })
  })

  it("should return 403 when the user is blocked by the event host", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEventInput)
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
      ...testEventInput,
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
    const event = await callCreateEvent(eventOwnerToken, testEventInput)
    await callJoinEvent(attendeeToken, parseInt(event.body.id))
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 200,
      body: { id: attendeeId, token: expect.anything() } // should be event id?
    })
  })
})
