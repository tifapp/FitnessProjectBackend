import { conn } from "TiFBackendUtils"
import { randomUUID } from "crypto"
import { withEmptyResponseBody } from "../../test/assertions.js"
import { resetDatabaseBeforeEach } from "../../test/database.js"
import { callGetUpcomingEvents, callJoinEvent, callSetArrival } from "../../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../../test/helpers/users.js"
import { testEvents } from "../../test/testEvents.js"
import { createEvent } from "../createEvent.js"

describe("getUpcomingEvents tests", () => {
  resetDatabaseBeforeEach()

  it("should return 204 with an empty array if the user has no upcoming events", async () => {
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser
    )

    expect(withEmptyResponseBody(await callGetUpcomingEvents(attendeeToken))).toMatchObject({
      status: 204,
      body: ""
    })
  })

  it("should return 200 with an array of events if the user has upcoming events", async () => {
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser
    )

    const eventLocation = { latitude: 50, longitude: 50 }

    await callSetArrival(attendeeToken, {
      coordinate: eventLocation
    })

    const { value: { insertId: farTestEventId } } = await createEvent(
      conn,
      { ...testEvents[0], ...eventLocation, startTimestamp: new Date(new Date().setMonth(new Date().getMonth() + 1)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )

    const { value: { insertId: arrivedTestEventId } } = await createEvent(
      conn,
      { ...testEvents[0], ...eventLocation, startTimestamp: new Date(new Date().setHours(new Date().getHours() + 12)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )

    const { value: { insertId: ongoingTestEventId } } = await createEvent(
      conn,
      { ...testEvents[0], ...eventLocation, startTimestamp: new Date(new Date().setHours(new Date().getHours() - 12)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )

    const { value: { insertId: notArrivedTestEventId } } = await createEvent(
      conn,
      { ...testEvents[0], latitude: 25, longitude: 25, startTimestamp: new Date(new Date().setHours(new Date().getHours() + 12)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )

    await createEvent(
      conn,
      { ...testEvents[0], ...eventLocation, startTimestamp: new Date(new Date().setHours(new Date().getHours() + 12)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )

    await callJoinEvent(attendeeToken, parseInt(farTestEventId))
    await callJoinEvent(attendeeToken, parseInt(arrivedTestEventId))
    await callJoinEvent(attendeeToken, parseInt(ongoingTestEventId))
    await callJoinEvent(attendeeToken, parseInt(notArrivedTestEventId))

    expect(await callGetUpcomingEvents(attendeeToken)).toMatchObject({
      status: 200,
      body: {
        upcomingRegions: [{
          arrivalRadiusMeters: 500,
          isArrived: true,
          eventIds: [
            parseInt(ongoingTestEventId),
            parseInt(arrivedTestEventId)
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
            parseInt(notArrivedTestEventId)
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
