import { conn } from "TiFBackendUtils"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { dayjs } from "TiFShared/lib/Dayjs"
import { randomInt } from "crypto"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import {
  testEventInput,
  testEventInputCoordinate,
  upcomingEventDateRange
} from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"

const eventLocation = { latitude: 50, longitude: 50 }

describe("Join the event by id tests", () => {
  it("should not save arrival when the user passes an outdated location", async () => {
    const host = await createUserFlow()
    const attendee = await createUserFlow()
    const event = await testAPI.createEvent({
      auth: host.auth,
      body: testEventInput
    })
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
      data: { id: event.data.id, hasArrived: false }
    })

    const attendeesResp = await testAPI.attendeesList({
      auth: attendee.auth,
      params: { eventId: event.data.id },
      query: { limit: 2 }
    })

    expect(attendeesResp).toMatchObject({
      status: 200,
      data: {
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
    const {
      eventIds: [eventId]
    } = await createEventFlow([{}])
    const attendee = await createUserFlow()
    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: {
        region: {
          arrivalRadiusMeters: 0,
          coordinate: testEventInput.location.value as LocationCoordinate2D
        }
      }
    })

    expect(resp).toMatchObject({
      status: 201,
      data: { id: eventId, hasArrived: true }
    })

    const attendeesResp = await testAPI.attendeesList({
      auth: attendee.auth,
      params: { eventId },
      query: { limit: 2 }
    })

    expect(attendeesResp).toMatchObject({
      status: 200,
      data: {
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
    const {
      eventIds: [eventId]
    } = await createEventFlow([{ dateRange: upcomingEventDateRange }])
    const attendee = await createUserFlow()
    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: undefined
    })
    expect(resp).toMatchObject({
      status: 201,
      data: {
        id: eventId,
        trackableRegions: [
          {
            eventIds: [eventId],
            coordinate: testEventInput.location.value,
            hasArrived: false,
            arrivalRadiusMeters: 500
          }
        ]
      }
    })
  })

  it("should return 403 when the user is blocked by the event host", async () => {
    const {
      host,
      eventIds: [eventId]
    } = await createEventFlow([{}])
    const attendee = await createUserFlow()
    await testAPI.blockUser(userToUserRequest(host, attendee))
    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: undefined
    })
    expect(resp).toMatchObject({
      status: 403,
      data: { error: "blocked-you" }
    })
  })

  it("should return 404 if the event doesn't exist", async () => {
    const attendee = await createUserFlow()
    const eventId = randomInt(1000)
    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: undefined
    })
    expect(resp).toMatchObject({
      status: 404,
      data: { error: "event-not-found" } // will need to add some middleware similar to auth middleware to assert event exists
    })
  })

  it("should return 403 when the event has ended", async () => {
    const host = await createUserFlow()
    const attendee = await createUserFlow()

    // normally we can't create events in the past so we'll add this ended event to the table directly
    const {
      value: { insertId: eventId }
    } = await conn.executeResult(
      `
      INSERT INTO event (
        hostId,
        title,
        startDateTime,
        endDateTime,
        latitude,
        longitude,
        endedDateTime
      ) VALUES (
        :hostId,
        :title,
        :startDateTime,
        :endDateTime,
        :latitude,
        :longitude,
        :endedDateTime
      )
      `,
      {
        hostId: host.id,
        title: testEventInput.title,
        latitude: (testEventInput.location.value as LocationCoordinate2D)
          .latitude,
        longitude: (testEventInput.location.value as LocationCoordinate2D)
          .longitude,
        startDateTime: dayjs().subtract(24, "hour").toDate(),
        endDateTime: dayjs().subtract(12, "hour").toDate(),
        endedDateTime: dayjs().subtract(12, "hour").toDate()
      }
    )

    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId: Number(eventId) },
      body: undefined
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "event-has-ended" }
    })
  })

  it("should return 200 when the user tries to join an event twice", async () => {
    const {
      eventIds: [eventId]
    } = await createEventFlow([{}])
    const attendee = await createUserFlow()
    await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: undefined
    })
    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: undefined
    })
    expect(resp).toMatchObject({
      status: 200,
      data: { id: eventId }
    })
  })

  it("should only count the attendee once when joining an event twice", async () => {
    const {
      eventIds: [eventId]
    } = await createEventFlow([{}])
    const attendee = await createUserFlow()
    await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: {
        region: {
          coordinate: testEventInputCoordinate,
          arrivalRadiusMeters: 100
        }
      }
    })
    await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: {
        region: {
          coordinate: testEventInputCoordinate,
          arrivalRadiusMeters: 100
        }
      }
    })

    const resp = await testAPI.eventDetails<200>({
      auth: attendee.auth,
      params: { eventId }
    })
    console.log(resp.data)
    expect(resp.data.attendeeCount).toEqual(2)
    expect(new Set(resp.data.previewAttendees.map((a) => a.id)).size).toEqual(2)
  })

  it("should return 403 when the event was cancelled", async () => {
    const {
      eventIds: [eventId],
      host,
      attendeesList: [, attendee]
    } = await createEventFlow(
      [
        {
          location: {
            type: "coordinate",
            value: eventLocation
          }
        }
      ],
      1
    )

    await testAPI.endEvent({ auth: host.auth, params: { eventId } })
    const resp = await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId },
      body: undefined
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "event-was-cancelled" }
    })
  })

  test("join event, only lists 1 attendance record for user after arriving at multiple locations", async () => {
    const user = await createUserFlow()
    const {
      eventIds: [eventId]
    } = await createEventFlow(
      [{ location: { type: "coordinate", value: eventLocation } }],
      0
    )
    await testAPI.updateArrivalStatus({
      auth: user.auth,
      body: {
        status: "arrived",
        coordinate: { latitude: -33.86882, longitude: 151.209296 },
        arrivalRadiusMeters: 200
      }
    })
    await testAPI.joinEvent<201>({
      auth: user.auth,
      params: { eventId },
      body: {
        region: {
          coordinate: eventLocation,
          arrivalRadiusMeters: 200
        }
      }
    })
    const resp = await testAPI.eventDetails<200>({
      auth: user.auth,
      params: { eventId }
    })
    expect(resp.data.attendeeCount).toEqual(2) // NB: Host + User
  })
})
