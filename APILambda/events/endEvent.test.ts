import { testAPI } from "../test/testApp"
import { createEventFlow } from "../test/userFlows/createEventFlow"

describe("End/cancel event tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return 204 if host cancels ongoing event", async () => {
    const { eventIds, host } = await createEventFlow(
      [
        {
          coordinates: eventLocation,
        }
      ],
      0
    )

    const resp = await testAPI.endEvent({ auth: host.auth, params: { eventId: eventIds[0] } })
    expect(resp).toMatchObject({
      status: 204
    })
  })

  it("should return 403 if attendee tries to cancel event", async () => {
    const {
      attendeesList,
      eventIds
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation,
        }
      ],
      1
    )

    const resp = await testAPI.endEvent({ auth: attendeesList[1].auth, params: { eventId: eventIds[0] } })
    expect(resp).toMatchObject({
      status: 403,
      data: { error: "cannot-end-event" }
    })
  })

  it("should return 403 if host tries to cancel an ended event", async () => {
    const {
      eventIds: [eventId],
      host
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation,
        }
      ],
      1
    )

    await testAPI.endEvent({ auth: host.auth, params: { eventId } })
    const resp = await testAPI.endEvent({ auth: host.auth, params: { eventId } })
    expect(resp).toMatchObject({
      status: 403,
      data: { error: "cannot-end-event" }
    })
  })
})
