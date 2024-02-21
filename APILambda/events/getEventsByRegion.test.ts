import { conn } from "TiFBackendUtils"
import dayjs from "dayjs"
import { callGetEventsByRegion } from "../test/helpers/events.js"
import { testEventInput } from "../test/testEvents.js"
import { createEventFlow } from "../test/userFlows/events.js"
import { addPlacemarkToDB } from "./sharedSQL.js"
import { getAttendeeCount, getAttendees } from "./getEventsByRegion.js"
import { callBlockUser } from "../test/apiCallers/users.js"

let eventOwnerTestToken: string
let attendeeTestToken: string
let eventOwnerTestId: string
let attendeeTestId: string
let futureEventTestId: number
let ongoingEventTestId: number

const setupDB = async () => {
  addPlacemarkToDB({
    lat: testEventInput.latitude,
    lon: testEventInput.longitude,
    name: "Sample Location",
    city: "Sample Neighborhood",
    country: "Sample Country",
    street: "Sample Street",
    street_num: "1234",
    unit_number: "5678"
  })

  const eventLocation = {
    latitude: testEventInput.latitude,
    longitude: testEventInput.longitude
  }

  const {
    attendeeToken,
    attendeeId,
    hostId,
    hostToken,
    eventIds: [futureEventId, ongoingEventId]
  } = await createEventFlow([
    {
      ...eventLocation,
      startTimestamp: dayjs().add(12, "hour").toDate(),
      endTimestamp: dayjs().add(1, "year").toDate()
    },
    {
      ...eventLocation,
      startTimestamp: dayjs().subtract(12, "hour").toDate(),
      endTimestamp: dayjs().add(1, "year").toDate()
    }
  ])

  attendeeTestToken = attendeeToken
  eventOwnerTestToken = hostToken
  attendeeTestId = attendeeId
  eventOwnerTestId = hostId
  ongoingEventTestId = ongoingEventId
  futureEventTestId = futureEventId
}

describe("Testing the getEventsByRegion endpoint", () => {
  beforeEach(setupDB)

  it("should return 200 with the event, user relation, attendee count data", async () => {
    const respGetEventsByRegion = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude,
      testEventInput.longitude,
      50000
    )

    expect(respGetEventsByRegion.status).toEqual(200)
    expect(respGetEventsByRegion.body).toHaveLength(2)
    const eventIds = [
      respGetEventsByRegion.body[0].id,
      respGetEventsByRegion.body[1].id
    ]
    expect(eventIds).toContain(ongoingEventTestId)
    expect(eventIds).toContain(futureEventTestId)
  })
})

describe("Testing the individual queries from the getEventsByRegion endpoint", () => {
  beforeEach(setupDB)

  it("should not return events that are not within the radius", async () => {
    const events = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude + 10,
      testEventInput.longitude + 10,
      1
    )
    expect(events.body).toHaveLength(0)
  })

  it("should remove the events where the attendee blocks the host", async () => {
    await callBlockUser(attendeeTestToken, eventOwnerTestId)

    const events = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude,
      testEventInput.longitude,
      50000
    )
    expect(events.body).toHaveLength(0)
  })

  it("should remove the events where the host blocks the attendee", async () => {
    await callBlockUser(eventOwnerTestToken, attendeeTestId)

    const events = await callGetEventsByRegion(
      attendeeTestToken,
      testEventInput.latitude,
      testEventInput.longitude,
      50000
    )
    expect(events.body).toHaveLength(0)
  })

  it("should return the attendee list not including the event host", async () => {
    const attendees = await getAttendees(conn, [`${ongoingEventTestId}`])
    expect(attendees.value).toHaveLength(1)
    expect(attendees.value[0].userIds).not.toEqual(eventOwnerTestId)
  })

  it("should return the attendee count including the event host", async () => {
    const attendees = await getAttendeeCount(conn, [`${ongoingEventTestId}`])
    expect(attendees.value[0].attendeeCount).toEqual(2)
  })
})
