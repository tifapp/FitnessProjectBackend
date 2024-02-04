import dayjs from "dayjs"
import { callGetEvent, callSetArrival, callSetDeparture } from "../../test/apiCallers/events.js"
import { createEventFlow } from "../../test/userFlows/events.js"

const eventLocation = { latitude: 50, longitude: 50 }

describe("SetArrivalStatus tests", () => {
  it("should return upcoming events from the arrived and departed endpoints", async () => {
    // cant mock planetscale time
    const { attendeesList: [attendee], eventIds } = await createEventFlow([{
      ...eventLocation,
      startTimestamp: dayjs().add(12, "hour").toDate(),
      endTimestamp: dayjs().add(1, "year").toDate()
    }], 1)

    expect(await callSetArrival(attendee.token, {
      coordinate: eventLocation
    })).toMatchObject({
      body: {
        upcomingRegions: [{
          eventIds,
          isArrived: true
        }]
      }
    })

    expect(await callSetDeparture(attendee.token, {
      coordinate: eventLocation
    })).toMatchObject({
      body: {
        upcomingRegions: [{
          eventIds,
          isArrived: false
        }]
      }
    })
  })

  it("should persist arrival when checking events", async () => {
    const { attendeesList: [attendee], eventIds } = await createEventFlow([{ ...eventLocation }], 1)

    await callSetArrival(attendee.token, {
      coordinate: eventLocation
    })

    expect(await callGetEvent(attendee.token, eventIds[0])).toMatchObject({
      body: {
        arrivalStatus: "arrived"
      }
    })

    await callSetDeparture(attendee.token, {
      coordinate: eventLocation
    })

    expect(await callGetEvent(attendee.token, eventIds[0])).toMatchObject({
      body: {
        arrivalStatus: "not-arrived"
      }
    })
  })

  // test max limit case, should delete old arrivals
})
