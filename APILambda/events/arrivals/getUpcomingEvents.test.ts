import dayjs from "dayjs"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { testAPI } from "../../test/testApp"
import {
  testEventCoordinate,
  testEventInput,
  upcomingEventDateRange
} from "../../test/testEvents"
import { createEventFlow } from "../../test/userFlows/createEventFlow"
import { createUserFlow } from "../../test/userFlows/createUserFlow"

describe("getUpcomingEvents tests", () => {
  it("should return 200 with an empty array if the user has no upcoming events", async () => {
    const attendee = await createUserFlow()

    expect(
      await testAPI.upcomingEventArrivalRegions({ auth: attendee.auth })
    ).toMatchObject({
      status: 200,
      data: { trackableRegions: [] }
    })
  })

  it("should return 200 with an array of events if the user has upcoming events", async () => {
    const {
      attendeesList,
      host,
      eventIds: [arrivedTestEventId, ongoingTestEventId, notArrivedTestEventId]
    } = await createEventFlow(
      [
        {
          location: {
            type: "coordinate",
            value: testEventCoordinate
          },
          dateRange: upcomingEventDateRange
        },
        {
          location: {
            type: "coordinate",
            value: testEventCoordinate
          },
          dateRange: dateRange(
            dayjs().toDate(),
            dayjs().add(1, "year").toDate()
          )
        },
        {
          location: {
            type: "coordinate",
            value: {
              latitude: 25,
              longitude: 25
            }
          },
          dateRange: upcomingEventDateRange
        },
        {
          location: {
            type: "coordinate",
            value: testEventCoordinate
          },
          dateRange: dateRange(
            dayjs().add(1, "month").toDate(),
            dayjs().add(1, "year").toDate()
          )
        }
      ],
      1
    )

    // this tests an unrelated event that should not appear in upcoming list
    await testAPI.createEvent({
      auth: host.auth,
      body: {
        ...testEventInput,
        location: {
          type: "coordinate",
          value: testEventCoordinate
        },
        startDateTime: upcomingEventDateRange.startDateTime,
        duration: upcomingEventDateRange.diff.seconds
      }
    })

    await testAPI.updateArrivalStatus({
      auth: attendeesList[1].auth,
      body: {
        status: "arrived",
        coordinate: testEventCoordinate,
        arrivalRadiusMeters: 500
      }
    })

    expect(
      await testAPI.upcomingEventArrivalRegions({ auth: attendeesList[1].auth })
    ).toMatchObject({
      status: 200,
      data: {
        trackableRegions: [
          {
            arrivalRadiusMeters: 500,
            hasArrived: true,
            eventIds: [ongoingTestEventId, arrivedTestEventId],
            coordinate: {
              latitude: 50,
              longitude: 50
            }
          },
          {
            arrivalRadiusMeters: 500,
            hasArrived: false,
            eventIds: [notArrivedTestEventId],
            coordinate: {
              latitude: 25,
              longitude: 25
            }
          }
        ]
      }
    })
  })
})
