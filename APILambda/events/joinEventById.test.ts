import { conn } from "TiFBackendUtils"
import { randomInt } from "crypto"
import dayjs from "dayjs"
import { callCreateEvent, callEndEvent, callGetAttendees, callJoinEvent } from "../test/apiCallers/eventEndpoints.js"
import { callBlockUser } from "../test/apiCallers/userEndpoints.js"
import { testEventInput } from "../test/testEvents.js"
import { createEventFlow } from "../test/userFlows/createEventFlow.js"
import { createUserFlow } from "../test/userFlows/createUserFlow.js"
import { createEvent } from "./createEvent.js"

const eventLocation = { latitude: 50, longitude: 50 }

describe("Join the event by id tests", () => {
  it("should not save arrival when the user passes an outdated location", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEventInput)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id), {
      region: {
        arrivalRadiusMeters: 0,
        coordinate: { latitude: 0, longitude: 0 }
      }
    })
    expect(resp).toMatchObject({
      status: 201,
      body: { id: parseInt(event.body.id), token: expect.anything(), hasArrived: false }
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
            hasArrived: false
          })
        ])
      }
    })
  })

  it("should save arrival when the user passes a location", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken, userId: attendeeId } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, { ...testEventInput })
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id), {
      region: {
        arrivalRadiusMeters: 0,
        coordinate: {
          latitude: testEventInput.latitude,
          longitude: testEventInput.longitude
        }
      }
    })
    expect(resp).toMatchObject({
      status: 201,
      body: { id: parseInt(event.body.id), token: expect.anything(), hasArrived: true }
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
            hasArrived: true
          })
        ])
      }
    })
  })

  it("should return 201 when the user is able to successfully join the event", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, {
      ...testEventInput,
      startDateTime: dayjs().add(12, "hour").toDate(),
      endDateTime: dayjs().add(24, "hour").toDate()
    })
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 201,
      body: {
        id: parseInt(event.body.id),
        token: expect.anything(),
        upcomingRegions: [
          {
            eventIds: [Number(event.body.id)],
            coordinate: {
              latitude: testEventInput.latitude,
              longitude: testEventInput.longitude
            },
            hasArrived: false,
            arrivalRadiusMeters: 500
          }
        ]
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
      startDateTime: dayjs().subtract(2, "month").toDate(),
      endDateTime: dayjs().subtract(1, "month").toDate()
    }, eventOwnerId)

    const resp = await callJoinEvent(attendeeToken, Number(eventId))

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-ended" }
    })
  })

  it("should return 200 when the user tries to join an event twice", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken } = await createUserFlow()
    const event = await callCreateEvent(eventOwnerToken, testEventInput)
    await callJoinEvent(attendeeToken, parseInt(event.body.id))
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp).toMatchObject({
      status: 200,
      body: { id: parseInt(event.body.id), token: expect.anything() }
    })
  })

  it("should return 403 if joining an event that has ended", async () => {
    const {
      eventIds,
      host,
      attendeesList
    } = await createEventFlow(
      [
        {
          ...eventLocation,
          startDateTime: dayjs().add(12, "hour").toDate(),
          endDateTime: dayjs().add(1, "year").toDate()
        }
      ],
      1
    )

    await callEndEvent(host.token, eventIds[0])
    const resp = await callJoinEvent(attendeesList[1].token, eventIds[0])

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-ended" }
    })
  })
})
