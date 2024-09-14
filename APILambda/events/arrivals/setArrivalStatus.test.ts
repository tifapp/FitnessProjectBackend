import { testAPI } from "../../test/testApp"
import { createEventFlow } from "../../test/userFlows/createEventFlow"

const eventLocation = { latitude: 50, longitude: 50 }

describe("SetHasArrived tests", () => {
  it("should return upcoming events from the arrived and departed endpoints", async () => {
    // cant mock planetscale time
    const { attendeesList, eventIds } = await createEventFlow([{
      coordinates: eventLocation
    }], 1)

    expect(await testAPI.arriveAtRegion({
      auth: attendeesList[1].auth,
      body: {
        coordinate: eventLocation,
        arrivalRadiusMeters: 500
      }
    })).toMatchObject({
      status: 200,
      data: {
        upcomingRegions: [{
          eventIds
        }]
      }
    })

    expect(await testAPI.departFromRegion({
      auth: attendeesList[1].auth,
      body: {
        coordinate: eventLocation,
        arrivalRadiusMeters: 500
      }
    })).toMatchObject({
      status: 200,
      data: {
        upcomingRegions: [{
          eventIds
        }]
      }
    })
  })

  it("should persist arrival when checking events", async () => {
    const { attendeesList, eventIds } = await createEventFlow([{ coordinates: eventLocation }], 1)

    await testAPI.arriveAtRegion({
      auth: attendeesList[1].auth,
      body: {
        coordinate: eventLocation,
        arrivalRadiusMeters: 500
      }
    })

    expect(await testAPI.eventDetails({ auth: attendeesList[1].auth, params: { eventId: eventIds[0] } })).toMatchObject({
      status: 200,
      data: {
        hasArrived: true
      }
    })

    await testAPI.departFromRegion({
      auth: attendeesList[1].auth,
      body: {
        coordinate: eventLocation,
        arrivalRadiusMeters: 500
      }
    })

    expect(await testAPI.eventDetails({ auth: attendeesList[1].auth, params: { eventId: eventIds[0] } })).toMatchObject({
      status: 200,
      data: {
        hasArrived: false
      }
    })
  })

  // test max limit case, should delete old arrivals
})
