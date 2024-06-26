import { conn, getAttendeeCount, getAttendees } from "TiFBackendUtils"
import dayjs from "dayjs"
import { addPlacemarkToDB } from "../../GeocodingLambda/utils.js"
import { callGetEventsByRegion } from "../test/helpers/events.js"
import { testEventInput } from "../test/testEvents.js"
import { createEventFlow } from "../test/userFlows/events.js"
// import { getAttendeeCount, getAttendees } from "./getEventsByRegion.js"
import { callEndEvent } from "../test/apiCallers/events.js"
import { callBlockUser } from "../test/apiCallers/users.js"

let eventOwnerTestToken: string
let attendeeTestToken: string
let eventOwnerTestId: string
let attendeeTestId: string
let futureEventTestId: number
let ongoingEventTestId: number

export const setupDB = async () => {
  addPlacemarkToDB(
    conn,
    {
      latitude: testEventInput.latitude,
      longitude: testEventInput.longitude,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      streetNumber: "1234"
    },
    "Sample/Timezone"
  )

  const eventLocation = {
    latitude: testEventInput.latitude,
    longitude: testEventInput.longitude
  }

  const {
    attendeesList,
    host,
    eventIds: [futureEventId, ongoingEventId]
  } = await createEventFlow([
    {
      ...eventLocation,
      startDateTime: dayjs().add(12, "hour").toDate(),
      endDateTime: dayjs().add(1, "year").toDate()
    },
    {
      ...eventLocation,
      startDateTime: dayjs().subtract(12, "hour").toDate(),
      endDateTime: dayjs().add(1, "year").toDate()
    }
  ], 1)

  attendeeTestToken = attendeesList[1].token
  eventOwnerTestToken = host.token
  attendeeTestId = attendeesList[1].userId
  eventOwnerTestId = host.userId
  ongoingEventTestId = ongoingEventId
  futureEventTestId = futureEventId
}

describe("getEventsByRegion endpoint tests", () => {
  beforeEach(setupDB)

  it("should return 200 with the event, user relation, attendee count data", async () => {
    const respGetEventsByRegion = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude,
      testEventInput.longitude,
      50000
    )

    expect(respGetEventsByRegion.status).toEqual(200)
    expect(respGetEventsByRegion.body.events).toHaveLength(2)
    const eventIds = [
      respGetEventsByRegion.body.events[0].id,
      respGetEventsByRegion.body.events[1].id
    ]
    expect(eventIds).toContain(ongoingEventTestId)
    expect(eventIds).toContain(futureEventTestId)
  })

  it("should not return events that are not within the radius", async () => {
    const events = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude + 10,
      testEventInput.longitude + 10,
      1
    )
    expect(events.body.events).toHaveLength(0)
  })

  it("should remove the events where the attendee blocks the host", async () => {
    await callBlockUser(attendeeTestToken, eventOwnerTestId)

    const events = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude,
      testEventInput.longitude,
      50000
    )
    expect(events.body.events).toHaveLength(0)
  })

  it("should remove the events where the host blocks the attendee", async () => {
    await callBlockUser(eventOwnerTestToken, attendeeTestId)

    const events = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude,
      testEventInput.longitude,
      50000
    )
    expect(events.body.events).toHaveLength(0)
  })

  it("should not return events that have ended", async () => {
    await callEndEvent(eventOwnerTestToken, futureEventTestId)
    await callEndEvent(eventOwnerTestToken, ongoingEventTestId)

    const events = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude,
      testEventInput.longitude,
      50000
    )
    expect(events.body.events).toHaveLength(0)
  })

  describe("tests for attendee count and attendee list queries within getEventsByRegion", () => {
    it("should return the attendee count including the event host", async () => {
      const attendees = await getAttendeeCount(conn, [`${ongoingEventTestId}`])
      expect(attendees.value[0].attendeeCount).toEqual(2)
    })

    it("should return the attendee list not including the event host", async () => {
      const attendees = await getAttendees(conn, [`${ongoingEventTestId}`])
      expect(attendees.value).toHaveLength(1)
      expect(attendees.value[0].userIds).not.toEqual(eventOwnerTestId)
    })
  })
})
