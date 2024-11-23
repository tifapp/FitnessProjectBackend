import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { dayjs } from "TiFShared/lib/Dayjs"
import { testAPI } from "../test/testApp"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("Leave event tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return 204 if user leaves the event", async () => {
    const {
      attendeesList: [, attendee],
      eventIds: [eventId]
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation
        }
      ],
      1
    )

    const resp = await testAPI.leaveEvent({
      auth: attendee.auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 204
    })
  })

  it("should return 400 if host leaves own event and co-host does not exist", async () => {
    const {
      host,
      eventIds: [eventId]
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation
        }
      ],
      1
    )

    const resp = await testAPI.leaveEvent({
      auth: host.auth,
      params: { eventId }
    })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "co-host-not-found" }
    })
  })

  it("should return 200 if user leaves event twice", async () => {
    const {
      attendeesList,
      eventIds: [eventId]
    } = await createEventFlow([{ coordinates: eventLocation }], 1)

    await testAPI.leaveEvent({
      auth: attendeesList[1].auth,
      params: { eventId }
    })
    const resp = await testAPI.leaveEvent({
      auth: attendeesList[1].auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 200
    })
  })

  it("should return 404 if user leaves an event that doesn't exist", async () => {
    const attendee = await createUserFlow()
    const nonExistantEventId = 9999
    const resp = await testAPI.leaveEvent({
      auth: attendee.auth,
      params: { eventId: nonExistantEventId }
    })

    expect(resp).toMatchObject({
      status: 404,
      data: { error: "event-not-found" }
    })
  })

  it("should return 403 if user leaves an event that ended before it starts", async () => {
    const {
      eventIds: [eventId],
      host,
      attendeesList: [, attendee]
    } = await createEventFlow([{ coordinates: eventLocation }], 1)

    await testAPI.endEvent({ auth: host.auth, params: { eventId } })
    const resp = await testAPI.leaveEvent({
      auth: attendee.auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "event-was-cancelled" }
    })
  })

  it("should return 403 if user leaves an event that ended", async () => {
    const {
      eventIds: [eventId],
      host,
      attendeesList: [, attendee]
    } = await createEventFlow(
      [
        {
          ...eventLocation,
          dateRange: dateRange(
            dayjs().subtract(1, "year").toDate(),
            dayjs().add(12, "hour").toDate()
          )
        }
      ],
      1
    )

    await testAPI.endEvent({ auth: host.auth, params: { eventId } })
    const resp = await testAPI.leaveEvent({
      auth: attendee.auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "event-has-ended" }
    })
  })

  // TODO: Test eventAttendance endpoint to check that the user is no longer on the eventAttendance list
})
