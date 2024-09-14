import { conn } from "TiFBackendUtils"
import { getAttendeeCount, getAttendees } from "TiFBackendUtils/TifEventUtils"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import dayjs from "dayjs"
import { it } from "node:test"
import { addLocationToDB } from "../../GeocodingLambda/utils"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { TestUser } from "../test/userFlows/createUserFlow"

let attendee: TestUser
let host: TestUser
let futureEventTestId: number
let ongoingEventTestId: number

const setupDB = async () => {
  await addLocationToDB(
    conn,
    {
      latitude: testEventInput.coordinates.latitude,
      longitude: testEventInput.coordinates.longitude,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      streetNumber: "1234"
    },
    "Sample/Timezone"
  )

  const eventLocation = {
    latitude: testEventInput.coordinates.latitude,
    longitude: testEventInput.coordinates.longitude
  }

  const {
    attendeesList: [, testAttendee],
    host: testHost,
    eventIds: [futureEventId, ongoingEventId]
  } = await createEventFlow([
    {
      ...eventLocation,
      dateRange: dateRange(dayjs().add(12, "hour").toDate(), dayjs().add(1, "year").toDate())
    },
    {
      ...eventLocation,
      dateRange: dateRange(dayjs().add(12, "hour").toDate(), dayjs().add(1, "year").toDate())
    }
  ], 1)

  attendee = testAttendee
  host = testHost
  ongoingEventTestId = ongoingEventId
  futureEventTestId = futureEventId
}

describe("exploreEvents endpoint tests", () => {
  beforeEach(setupDB)

  it("should return 200 with the event, user relation, attendee count data", async () => {
    const resp = await testAPI.exploreEvents({
      auth: attendee.auth,
      body: {
        userLocation: testEventInput.coordinates,
        radius: 50000
      }
    })

    expect(resp.status).toEqual(200)
    expect((resp.data as any).events).toHaveLength(2)
    const eventIds = [
      (resp.data as any).events[0].id,
      (resp.data as any).events[1].id
    ]
    expect(eventIds).toContain(ongoingEventTestId)
    expect(eventIds).toContain(futureEventTestId)
  })

  it("should not return events that are not within the radius", async () => {
    const events = await testAPI.exploreEvents({
      auth: attendee.auth,
      body: {
        userLocation: {
          latitude: testEventInput.coordinates.latitude + 10,
          longitude: testEventInput.coordinates.longitude + 10
        },
        radius: 1
      }
    })
    expect((events.data as any).events).toHaveLength(0)
  })

  it("should remove the events where the attendee blocks the host", async () => {
    await testAPI.blockUser(userToUserRequest(attendee, host))

    const events = await testAPI.exploreEvents({
      auth: attendee.auth,
      body: {
        userLocation: testEventInput.coordinates,
        radius: 50000
      }
    })
    expect((events.data as any).events).toHaveLength(0)
  })

  it("should remove the events where the host blocks the attendee", async () => {
    await testAPI.blockUser(userToUserRequest(host, attendee))

    const events = await testAPI.exploreEvents({
      auth: attendee.auth,
      body: {
        userLocation: testEventInput.coordinates,
        radius: 50000
      }
    })
    expect((events.data as any).events).toHaveLength(0)
  })

  it("should not return events that have ended", async () => {
    await testAPI.endEvent({ auth: host.auth, params: { eventId: futureEventTestId } })
    await testAPI.endEvent({ auth: host.auth, params: { eventId: ongoingEventTestId } })

    const events = await testAPI.exploreEvents({
      auth: attendee.auth,
      body: {
        userLocation: testEventInput.coordinates,
        radius: 50000
      }
    })
    expect((events.data as any).events).toHaveLength(0)
  })

  describe("tests for attendee count and attendee list queries within exploreEvents", () => {
    it("should return the attendee count including the event host", async () => {
      const attendees = await getAttendeeCount(conn, [`${ongoingEventTestId}`])
      expect(attendees.value[0].attendeeCount).toEqual(2)
    })

    it("should return the attendee list not including the event host", async () => {
      const attendees = await getAttendees(conn, [`${ongoingEventTestId}`])
      expect(attendees.value).toHaveLength(1)
      expect(attendees.value[0].userIds).not.toEqual(host.id)
    })
  })
})
