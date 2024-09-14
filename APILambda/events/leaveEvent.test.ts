import dayjs from "dayjs"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { testAPI } from "../test/testApp"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("Leave event tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return 204 if user leaves the event", async () => {
    const {
      attendeesList,
      eventIds: [eventId]
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation
        }
      ],
      1
    )

    const resp = await testAPI.leaveEvent({ auth: attendeesList[1].auth, params: { eventId } })

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

    const resp = await testAPI.leaveEvent({ auth: host.auth, params: { eventId } })
    expect(resp).toMatchObject({
      status: 400,
      body: { error: "co-host-not-found" }
    })
  })

  // use different status message if leaving twice?
  it("should return 400 if user leaves event twice", async () => {
    const {
      attendeesList,
      eventIds
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation
        }
      ],
      1
    )

    await testAPI.leaveEvent({ auth: attendeesList[1].auth, params: { eventIds } }[0])
    const resp = await testAPI.leaveEvent({ auth: attendeesList[1].auth, params: { eventIds } }[0])

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "already-left-event" }
    })
  })

  it("should return 404 if user leaves an event that doesn't exist", async () => {
    const attendee = await createUserFlow()
    const nonExistantEventId = 9999
    const resp = await testAPI.leaveEvent({ auth: attendee.auth, params: { eventId: nonExistantEventId } })

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" }
    })
  })

  it("should return 400 if user leaves an event that they haven't joined", async () => {
    const attendee = await createUserFlow()
    const { eventIds } = await createEventFlow(
      [
        {
          coordinates: eventLocation
        }
      ],
      1
    )

    const resp = await testAPI.leaveEvent({ auth: attendee.auth, params: { eventId: eventIds[0] } })

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "already-left-event" }
    })
  })

  it("should return 403 if user leaves an event that ended before it starts", async () => {
    const {
      eventIds,
      host,
      attendeesList
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation
        }
      ],
      1
    )

    await testAPI.endEvent({ auth: host.auth, params: { eventId: eventIds[0] } })
    const resp = await testAPI.leaveEvent({ auth: attendeesList[1].auth, params: { eventIds } }[0])

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-been-cancelled" }
    })
  })

  it("should return 403 if user leaves an event that ended", async () => {
    const {
      eventIds,
      host,
      attendeesList
    } = await createEventFlow(
      [
        {
          ...eventLocation,
          dateRange: dateRange(dayjs().subtract(1, "year").toDate(), dayjs().add(12, "hour").toDate())
        }
      ],
      1
    )

    await testAPI.endEvent({ auth: host.auth, params: { eventId: eventIds[0] } })
    const resp = await testAPI.leaveEvent({ auth: attendeesList[1].auth, params: { eventIds } }[0])

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-ended" }
    })
  })

  // TODO: Test eventAttendance endpoint to check that the user is no longer on the eventAttendance list
})
