import dayjs from "dayjs"
import { callCreateEvent, callGetUpcomingEvents, callSetArrival } from "../../test/apiCallers/eventEndpoints.js"
import { testEventInput } from "../../test/testEvents.js"
import { createEventFlow } from "../../test/userFlows/createEventFlow.js"
import { createUserFlow } from "../../test/userFlows/createUserFlow.js"

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

    const { attendeesList, host, eventIds: [arrivedTestEventId, ongoingTestEventId, notArrivedTestEventId] } = await createEventFlow([
      {
        ...eventLocation,
        startDateTime: dayjs().add(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      },
      {
        ...eventLocation,
        startDateTime: dayjs().subtract(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      },
      {
        latitude: 25,
        longitude: 25,
        startDateTime: dayjs().add(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      },
      {
        ...eventLocation,
        startDateTime: dayjs().add(1, "month").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      }
    ], 1)

    // unrelated event that should not appear in upcoming list
    await callCreateEvent(host.token,
      {
        ...testEventInput,
        ...eventLocation,
        startDateTime: dayjs().add(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      }
    )

    await callSetArrival(attendeesList[1].token, {
      coordinate: eventLocation
    })

    expect(await callGetUpcomingEvents(attendeesList[1].token)).toMatchObject({
      status: 200,
      body: {
        upcomingRegions: [{
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
