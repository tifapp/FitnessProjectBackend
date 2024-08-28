import dayjs from "dayjs"
import { callEndEvent, callLeaveEvent } from "../test/apiCallers/events"
import { createEventFlow } from "../test/userFlows/events"
import { createUserFlow } from "../test/userFlows/users"

describe("Leave event tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return 204 if user leaves the event", async () => {
    const {
      attendeesList,
      eventIds: [eventId]
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

    const resp = await callLeaveEvent(attendeesList[1].token, eventId)

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
          ...eventLocation,
          startDateTime: dayjs().add(12, "hour").toDate(),
          endDateTime: dayjs().add(1, "year").toDate()
        }
      ],
      1
    )

    const resp = await callLeaveEvent(host.token, eventId)

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
          ...eventLocation,
          startDateTime: dayjs().add(12, "hour").toDate(),
          endDateTime: dayjs().add(1, "year").toDate()
        }
      ],
      1
    )

    await callLeaveEvent(attendeesList[1].token, eventIds[0])
    const resp = await callLeaveEvent(attendeesList[1].token, eventIds[0])

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "already-left-event" }
    })
  })

  it("should return 404 if user leaves an event that doesn't exist", async () => {
    const { token: attendeeToken } = await createUserFlow()
    const nonExistantEventId = 9999
    const resp = await callLeaveEvent(attendeeToken, nonExistantEventId)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" }
    })
  })

  it("should return 400 if user leaves an event that they haven't joined", async () => {
    const { token: attendeeToken } = await createUserFlow()
    const { eventIds } = await createEventFlow(
      [
        {
          ...eventLocation,
          startDateTime: dayjs().add(12, "hour").toDate(),
          endDateTime: dayjs().add(1, "year").toDate()
        }
      ],
      1
    )

    const resp = await callLeaveEvent(attendeeToken, eventIds[0])

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
          ...eventLocation,
          startDateTime: dayjs().add(12, "hour").toDate(),
          endDateTime: dayjs().add(1, "year").toDate()
        }
      ],
      1
    )

    await callEndEvent(host.token, eventIds[0])
    const resp = await callLeaveEvent(attendeesList[1].token, eventIds[0])

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-been-cancelled" }
    })
  })

  it("should return 403 if user leaves an event that ended after it starts", async () => {
    const {
      eventIds,
      host,
      attendeesList
    } = await createEventFlow(
      [
        {
          ...eventLocation,
          startDateTime: dayjs().subtract(1, "year").toDate(),
          endDateTime: dayjs().add(12, "hour").toDate()
        }
      ],
      1
    )

    await callEndEvent(host.token, eventIds[0])
    const resp = await callLeaveEvent(attendeesList[1].token, eventIds[0])

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "event-has-ended" }
    })
  })

  // TODO: Test eventAttendance endpoint to check that the user is no longer on the eventAttendance list
})
