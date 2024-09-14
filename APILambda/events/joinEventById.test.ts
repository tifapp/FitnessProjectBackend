import { conn } from "TiFBackendUtils"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { randomInt } from "crypto"
import dayjs from "dayjs"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { createEventSQL } from "./createEvent"

const eventLocation = { latitude: 50, longitude: 50 }

describe("Join the event by id tests", () => {
  it("should not save arrival when the user passes an outdated location", async () => {
    const host = await createUserFlow()
    const attendee = await createUserFlow()
    const event = await testAPI.createEvent({ auth: host.auth, body: testEventInput })
    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId: event.data.id },
      body: {
        region: {
          arrivalRadiusMeters: 0,
          coordinate: { latitude: 0, longitude: 0 }
        }
      }
    })

    expect(resp).toMatchObject({
      status: 201,
      body: { id: event.data.id, token: expect.anything(), hasArrived: false }
    })

    const attendeesResp = await testAPI.attendeesList({
      auth: attendee.auth,
      params: { eventId: event.data.id },
      query: { limit: 2 }
    })

    expect(attendeesResp).toMatchObject({
      status: 200,
      body: {
        attendees: expect.arrayContaining([
          expect.objectContaining({
            id: attendee.id,
            hasArrived: false
          })
        ])
      }
    })
  })

  it("should save arrival when the user joins with a location", async () => {
    const { eventIds: [eventId] } = await createEventFlow([{}])
    const attendee = await createUserFlow()
    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: {
        region: {
          arrivalRadiusMeters: 0,
          coordinate: testEventInput.coordinates
        }
      }
    })

    expect(resp).toMatchObject({
      status: 201,
      body: { id: eventId, token: expect.anything(), hasArrived: true }
    })

    const attendeesResp = await testAPI.attendeesList({
      auth: attendee.auth,
      params: { eventId },
      query: { limit: 2 }
    })

    expect(attendeesResp).toMatchObject({
      status: 200,
      body: {
        attendees: expect.arrayContaining([
          expect.objectContaining({
            id: attendee.id,
            hasArrived: true
          })
        ])
      }
    })
  })

  it("should return 201 when the user is able to successfully join the event", async () => {
    const { eventIds: [eventId] } = await createEventFlow([{}])
    const attendee = await createUserFlow()
    const resp = await testAPI.joinEvent({ auth: attendee.auth, params: { eventId }, body: undefined })
    expect(resp).toMatchObject({
      status: 201,
      body: {
        id: eventId,
        token: expect.anything(),
        upcomingRegions: [
          {
            eventIds: [eventId],
            coordinate: testEventInput.coordinates,
            hasArrived: false,
            arrivalRadiusMeters: 500
          }
        ]
      }
    })
  })

  it("should return 403 when the user is blocked by the event host", async () => {
    const { host, eventIds: [eventId] } = await createEventFlow([{}])
    const attendee = await createUserFlow()
    await testAPI.blockUser(userToUserRequest(host, attendee))
    const resp = await testAPI.joinEvent({ auth: attendee.auth, params: { eventId }, body: undefined })
    expect(resp).toMatchObject({
      status: 403,
      body: { error: "user-is-blocked" }
    })
  })

  it("should return 404 if the event doesn't exist", async () => {
    const attendee = await createUserFlow()
    const eventId = randomInt(1000)
    const resp = await testAPI.joinEvent({ auth: attendee.auth, params: { eventId }, body: undefined })
    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" } // will need to add some middleware similar to auth middleware to assert event exists
    })
  })

  it("should return 403 when the event has ended", async () => {
    const host = await createUserFlow()
    const attendee = await createUserFlow()

    // normally we can't create events in the past so we'll add this ended event to the table directly
    const { value: { insertId: eventId } } = await createEventSQL(conn, {
      ...testEventInput,
      dateRange: dateRange(dayjs().subtract(2, "month").toDate(), dayjs().subtract(1, "month").toDate())!
    }, host.id)

    const resp = await testAPI.joinEvent({ auth: attendee.auth, params: { eventId: Number(eventId) }, body: undefined })

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-ended" }
    })
  })

  it("should return 200 when the user tries to join an event twice", async () => {
    const { eventIds: [eventId] } = await createEventFlow([{}])
    const attendee = await createUserFlow()
    await testAPI.joinEvent({ auth: attendee.auth, params: { eventId }, body: undefined })
    const resp = await testAPI.joinEvent({ auth: attendee.auth, params: { eventId }, body: undefined })
    expect(resp).toMatchObject({
      status: 200,
      body: { id: eventId, token: expect.anything() }
    })
  })

  it("should return 403 if joining an event that has ended", async () => {
    const {
      eventIds: [eventId],
      host,
      attendeesList: [, attendee]
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation
        }
      ],
      1
    )

    await testAPI.endEvent({ auth: host.auth, params: { eventId } })
    const resp = await testAPI.joinEvent({ auth: attendee.auth, params: { eventId }, body: undefined })

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-ended" }
    })
  })
})
