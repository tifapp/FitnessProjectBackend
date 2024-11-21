import { testAPI } from "../../test/testApp"
import { upcomingEventDateRange } from "../../test/testEvents"
import { createEventFlow } from "../../test/userFlows/createEventFlow"

const eventLocation = { latitude: 50, longitude: 50 }

describe("SetHasArrived tests", () => {
  it("should return upcoming events from the arrived and departed endpoints", async () => {
    // cant mock planetscale time
    const {
      attendeesList: [, attendee],
      eventIds
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation,
          dateRange: upcomingEventDateRange
        }
      ],
      1
    )

    expect(
      await testAPI.updateArrivalStatus({
        auth: attendee.auth,
        body: {
          coordinate: eventLocation,
          arrivalRadiusMeters: 500,
          status: "arrived"
        }
      })
    ).toMatchObject({
      status: 200,
      data: {
        trackableRegions: [
          {
            eventIds
          }
        ]
      }
    })

    expect(
      await testAPI.updateArrivalStatus({
        auth: attendee.auth,
        body: {
          coordinate: eventLocation,
          arrivalRadiusMeters: 500,
          status: "departed"
        }
      })
    ).toMatchObject({
      status: 200,
      data: {
        trackableRegions: [
          {
            eventIds
          }
        ]
      }
    })
  })

  it("should persist arrival when checking events", async () => {
    const {
      attendeesList: [, attendee],
      eventIds
    } = await createEventFlow(
      [
        {
          coordinates: eventLocation,
          dateRange: upcomingEventDateRange
        }
      ],
      1
    )

    await testAPI.updateArrivalStatus({
      auth: attendee.auth,
      body: {
        coordinate: eventLocation,
        arrivalRadiusMeters: 500,
        status: "arrived"
      }
    })

    expect(
      await testAPI.eventDetails({
        auth: attendee.auth,
        params: { eventId: eventIds[0] }
      })
    ).toMatchObject({
      status: 200,
      data: {
        hasArrived: true
      }
    })

    await testAPI.updateArrivalStatus({
      auth: attendee.auth,
      body: {
        coordinate: eventLocation,
        arrivalRadiusMeters: 500,
        status: "departed"
      }
    })

    expect(
      await testAPI.eventDetails({
        auth: attendee.auth,
        params: { eventId: eventIds[0] }
      })
    ).toMatchObject({
      status: 200,
      data: {
        hasArrived: false
      }
    })
  })

  // test max limit case, should delete old arrivals
})
