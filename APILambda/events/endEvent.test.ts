import dayjs from "dayjs"
import { callEndEvent } from "../test/apiCallers/events.js"
import { createEventFlow } from "../test/userFlows/events.js"

describe("End/cancel event tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return 204 if host cancels ongoing event", async () => {
    const { eventIds, host } = await createEventFlow(
      [
        {
          ...eventLocation,
          startTimestamp: dayjs().add(12, "hour").toDate(),
          endTimestamp: dayjs().add(1, "year").toDate()
        }
      ],
      0
    )

    const resp = await callEndEvent(host.token, eventIds[0])
    expect(resp).toMatchObject({
      status: 204
    })
  })

  it("should return 403 if attendee tries to cancel event", async () => {
    const {
      attendeesList: [attendee],
      eventIds
    } = await createEventFlow(
      [
        {
          ...eventLocation,
          startTimestamp: dayjs().add(12, "hour").toDate(),
          endTimestamp: dayjs().add(1, "year").toDate()
        }
      ],
      1
    )

    const resp = await callEndEvent(attendee.token, eventIds[0])
    expect(resp).toMatchObject({
      status: 403,
      body: { error: "cannot-end-event" }
    })
  })

  it("should return 403 if host tries to cancel an ended event", async () => {
    const {
      attendeesList: [attendee],
      eventIds,
      host
    } = await createEventFlow(
      [
        {
          ...eventLocation,
          startTimestamp: dayjs().add(12, "hour").toDate(),
          endTimestamp: dayjs().add(1, "year").toDate()
        }
      ],
      1
    )

    await callEndEvent(host.token, eventIds[0])
    const resp = await callEndEvent(attendee.token, eventIds[0])
    expect(resp).toMatchObject({
      status: 403,
      body: { error: "cannot-end-event" }
    })
  })
})
