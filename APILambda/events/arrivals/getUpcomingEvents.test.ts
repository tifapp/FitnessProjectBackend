import dayjs from "dayjs"
import { callCreateEvent, callGetUpcomingEvents, callSetArrival } from "../../test/apiCallers/events.js"
import { testEventInput } from "../../test/testEvents.js"
import { createEventFlow } from "../../test/userFlows/events.js"
import { createUserFlow } from "../../test/userFlows/users.js"

describe("getUpcomingEvents tests", () => {
  it("should return 200 with an empty array if the user has no upcoming events", async () => {
    const { token: attendeeToken } = await createUserFlow()

    expect(await callGetUpcomingEvents(attendeeToken)).toMatchObject({
      status: 200,
      body: { upcomingRegions: [] }
    })
  })

  it("should return 200 with an array of events if the user has upcoming events", async () => {
    const eventLocation = { latitude: 50, longitude: 50 }

    const { attendeeToken, hostToken, eventIds: [, arrivedTestEventId, ongoingTestEventId, notArrivedTestEventId] } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(1, "month").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      },
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      },
      {
        ...eventLocation,
        startTimestamp: dayjs().subtract(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      },
      {
        latitude: 25,
        longitude: 25,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    // unrelated event that should not appear in upcoming list
    await callCreateEvent(hostToken,
      {
        ...testEventInput,
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    )

    await callSetArrival(attendeeToken, {
      coordinate: eventLocation
    })

    expect(await callGetUpcomingEvents(attendeeToken)).toMatchObject({
      status: 200,
      body: {
        upcomingRegions: [{
          arrivalRadiusMeters: 500,
          isArrived: true,
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
          isArrived: false,
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
