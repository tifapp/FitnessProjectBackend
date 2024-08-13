import dayjs from "dayjs"
import { callGetEvent, callSetArrival, callSetDeparture } from "../../test/apiCallers/eventEndpoints.js"
import { createEventFlow } from "../../test/userFlows/createEventFlow.js"

const eventLocation = { latitude: 50, longitude: 50 }

describe("SetHasArrived tests", () => {
  it("should return upcoming events from the arrived and departed endpoints", async () => {
    // cant mock planetscale time
    const { attendeesList, eventIds } = await createEventFlow([{
      ...eventLocation,
      startDateTime: dayjs().add(12, "hour").toDate(),
      endDateTime: dayjs().add(1, "year").toDate()
    }], 1)

    expect(await callSetArrival(attendeesList[1].token, {
      coordinate: eventLocation
    })).toMatchObject({
      body: {
        upcomingRegions: [{
          eventIds
        }]
      }
    })

    expect(await callSetDeparture(attendeesList[1].token, {
      coordinate: eventLocation
    })).toMatchObject({
      body: {
        upcomingRegions: [{
          eventIds
        }]
      }
    })
  })

  it("should persist arrival when checking events", async () => {
    const { attendeesList, eventIds } = await createEventFlow([{ ...eventLocation }], 1)

    await callSetArrival(attendeesList[1].token, {
      coordinate: eventLocation
    })

    expect(await callGetEvent(attendeesList[1].token, eventIds[0])).toMatchObject({
      body: {
        hasArrived: true
      }
    })

    await callSetDeparture(attendeesList[1].token, {
      coordinate: eventLocation
    })

    expect(await callGetEvent(attendeesList[1].token, eventIds[0])).toMatchObject({
      body: {
        hasArrived: false
      }
    })
  })

  // test max limit case, should delete old arrivals
})
