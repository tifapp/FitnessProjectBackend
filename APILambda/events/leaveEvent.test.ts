import { callJoinEvent, callLeaveEvent } from "../test/apiCallers/events.js"
import { createEventFlow } from "../test/userFlows/events.js"
import dayjs from "dayjs"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Leave event tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return 204 if user leaves the event", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    await callJoinEvent(attendeeToken, eventIds[0])
    const resp = await callLeaveEvent(attendeeToken, eventIds[0])

    expect(resp).toMatchObject({
      status: 204
    })
  })

  it("should return 400 if host leaves own event and co-host does not exist", async () => {
    const { hostToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const resp = await callLeaveEvent(hostToken, eventIds[0])

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "co-host-not-found" }
    })
  })

  it("should return 200 if user leaves event twice", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    await callLeaveEvent(attendeeToken, eventIds[0])
    const resp = await callLeaveEvent(attendeeToken, eventIds[0])

    expect(resp).toMatchObject({
      status: 200
    })
  })

  it("should return 200 if user leaves an event that doesn't exist", async () => {
    const { token: attendeeToken } = await createUserFlow()
    const nonExistantEventId = 9999
    const resp = await callLeaveEvent(attendeeToken, nonExistantEventId)

    expect(resp).toMatchObject({
      status: 200
    })
  })

  it("should return 200 if user leaves an event that they haven't joined", async () => {
    const { token: attendeeToken } = await createUserFlow()
    const { eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const resp = await callLeaveEvent(attendeeToken, eventIds[0])

    expect(resp).toMatchObject({
      status: 200
    })
  })

  // TODO: Test eventAttendance endpoint to check that the user is no longer there
})
