import dayjs from "dayjs"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { testAPI } from "../../test/testApp"
import { testEventInput, upcomingEventDateRange } from "../../test/testEvents"
import { createEventFlow } from "../../test/userFlows/createEventFlow"
import { createUserFlow } from "../../test/userFlows/createUserFlow"

describe("getUpcomingEvents tests", () => {
  it("should return 200 with an empty array if the user has no upcoming events", async () => {
    const attendee = await createUserFlow()

    expect(await testAPI.upcomingEventArrivalRegions({ auth: attendee.auth })).toMatchObject({
      status: 200,
      data: { trackableRegions: [] }
    })
  })

  it("should return 200 with an array of events if the user has upcoming events", async () => {
    const eventLocation = { latitude: 50, longitude: 50 }

    const { attendeesList, host, eventIds: [arrivedTestEventId, ongoingTestEventId, notArrivedTestEventId] } = await createEventFlow([
      {
        coordinates: eventLocation,
        dateRange: upcomingEventDateRange
      },
      {
        coordinates: eventLocation,
        dateRange: dateRange(dayjs().subtract(12, "hour").toDate(), dayjs().add(1, "year").toDate())
      },
      {
        coordinates: {
          latitude: 25,
          longitude: 25
        },
        dateRange: upcomingEventDateRange
      },
      {
        coordinates: eventLocation,
        dateRange: dateRange(dayjs().add(1, "month").toDate(), dayjs().add(1, "year").toDate())
      }
    ], 1)

    // this tests an unrelated event that should not appear in upcoming list
    await testAPI.createEvent({
      auth: host.auth,
      body: {
        ...testEventInput,
        coordinates: eventLocation,
        dateRange: upcomingEventDateRange!
      }
    })

    await testAPI.arriveAtRegion({
      auth: attendeesList[1].auth,
      body: {
        coordinate: eventLocation,
        arrivalRadiusMeters: 500
      }
    })

    expect(await testAPI.upcomingEventArrivalRegions({ auth: attendeesList[1].auth })).toMatchObject({
      status: 200,
      data: {
        trackableRegions: [{
          arrivalRadiusMeters: 500,
          hasArrived: true,
          eventIds: [
            ongoingTestEventId,
            arrivedTestEventId
          ],
          coordinate: {
            latitude: 50,
            longitude: 50
          }
        },
        {
          arrivalRadiusMeters: 500,
          hasArrived: false,
          eventIds: [
            notArrivedTestEventId
          ],
          coordinate: {
            latitude: 25,
            longitude: 25
          }
        }]
      }
    })
  })
})
