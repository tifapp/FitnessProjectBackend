import { callCreateEvent, callGetEvent, callJoinEvent, callSetArrival, callSetDeparture } from "../../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../../test/helpers/users.js"
import { testEvents } from "../../test/testEvents.js"

const eventLocation = { latitude: 50, longitude: 50 }

describe("SetArrivalStatus tests", () => {
  it("should return upcoming events from the arrived and departed endpoints", async () => {
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2
    )

    // cant mock planetscale time
    const eventResp = await callCreateEvent(attendeeToken, { ...testEvents[0], ...eventLocation, startTimestamp: new Date(new Date().setHours(new Date().getHours() + 12)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) })
    await callJoinEvent(attendeeToken, parseInt(eventResp.body.id))

    expect(await callSetArrival(attendeeToken, {
      coordinate: eventLocation
    })).toMatchObject({
      body: {
        upcomingRegions: [{
          eventIds: [
            parseInt(eventResp.body.id)
          ],
          isArrived: true
        }]
      }
    })

    expect(await callSetDeparture(attendeeToken, {
      coordinate: eventLocation
    })).toMatchObject({
      body: {
        upcomingRegions: [{
          eventIds: [
            parseInt(eventResp.body.id)
          ],
          isArrived: false
        }]
      }
    })
  })

  it("should persist arrival when checking events", async () => {
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2
    )

    const eventResp = await callCreateEvent(attendeeToken, { ...testEvents[0], ...eventLocation })

    await callSetArrival(attendeeToken, {
      coordinate: eventLocation
    })

    expect(await callGetEvent(attendeeToken, parseInt(eventResp.body.id))).toMatchObject({
      body: {
        arrivalStatus: "arrived"
      }
    })

    await callSetDeparture(attendeeToken, {
      coordinate: eventLocation
    })

    expect(await callGetEvent(attendeeToken, parseInt(eventResp.body.id))).toMatchObject({
      body: {
        arrivalStatus: "not-arrived"
      }
    })
  })

  // test max limit case, should delete old arrivals
})
