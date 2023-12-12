import { conn } from "TiFBackendUtils"
import { randomUUID } from "crypto"
import { resetDatabaseBeforeEach } from "../../test/database.js"
import { callCreateEvent, callGetEvent, callSetArrival, callSetDeparture } from "../../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../../test/helpers/users.js"
import { testEvents } from "../../test/testEvents.js"
import { createEvent } from "../createEvent.js"

const eventLocation = { latitude: 50, longitude: 50 }

describe("SetArrivalStatus tests", () => {
  resetDatabaseBeforeEach()

  // TODO: Add unit test for addNullResults

  it("should return arrivalStatuses when the user checks their arrival at different events", async () => {
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2
    )

    // cant mock planetscale time
    const { value: { insertId: farTestEventId } } = await createEvent(
      conn,
      { ...testEvents[2], ...eventLocation, startTimestamp: new Date(new Date().setMonth(new Date().getMonth() + 1)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )
    const { value: { insertId: earlyTestEventId } } = await createEvent(
      conn,
      { ...testEvents[0], ...eventLocation, startTimestamp: new Date(new Date().setHours(new Date().getHours() + 12)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )
    const { value: { insertId: onTimeTestEventId } } = await createEvent(
      conn,
      { ...testEvents[1], ...eventLocation, startTimestamp: new Date(new Date().setMinutes(new Date().getMinutes() + 30)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )
    const { value: { insertId: lateTestEventId } } = await createEvent(
      conn,
      { ...testEvents[2], ...eventLocation, startTimestamp: new Date(new Date().setMonth(new Date().getMonth() - 1)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )
    const { value: { insertId: invalidTestEventId } } = await createEvent(
      conn,
      { ...testEvents[2], latitude: 25, longitude: 25, startTimestamp: new Date(new Date().setHours(new Date().getHours() + 12)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )
    const { value: { insertId: endedTestEventId } } = await createEvent(
      conn,
      { ...testEvents[3], ...eventLocation, startTimestamp: new Date(new Date().setMonth(new Date().getMonth() - 2)), endTimestamp: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      randomUUID()
    )
    const { value: { insertId: endedAndInvalidTestEventId } } = await createEvent(
      conn,
      { ...testEvents[4], latitude: 25, longitude: 25, startTimestamp: new Date(new Date().setMonth(new Date().getMonth() - 2)), endTimestamp: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      randomUUID()
    )
    const { value: { insertId: farAndInvalidTestEventId } } = await createEvent(
      conn,
      { ...testEvents[3], latitude: 25, longitude: 25, startTimestamp: new Date(new Date().setMonth(new Date().getMonth() + 1)), endTimestamp: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      randomUUID()
    )

    const nonExistentEventId = 999

    const resp = await callSetArrival(attendeeToken, {
      location: eventLocation,
      events: [
        parseInt(farTestEventId),
        parseInt(earlyTestEventId),
        parseInt(onTimeTestEventId),
        parseInt(lateTestEventId),
        parseInt(invalidTestEventId),
        parseInt(endedTestEventId),
        parseInt(endedAndInvalidTestEventId),
        parseInt(farAndInvalidTestEventId),
        nonExistentEventId
      ]
    })

    expect(resp).toMatchObject({
      status: 200,
      body: {
        arrivalStatuses: [
          {
            arrivalStatus: "remove-from-tracking",
            id: parseInt(farTestEventId)
          },
          {
            arrivalStatus: "success",
            id: parseInt(earlyTestEventId)
          },
          {
            arrivalStatus: "success",
            id: parseInt(onTimeTestEventId)
          },
          {
            arrivalStatus: "success",
            id: parseInt(lateTestEventId)
          },
          {
            arrivalStatus: "outdated-coordinate",
            latitude: 25,
            longitude: 25,
            id: parseInt(invalidTestEventId)
          },
          {
            arrivalStatus: "remove-from-tracking",
            id: parseInt(endedTestEventId)
          },
          {
            arrivalStatus: "remove-from-tracking",
            id: parseInt(endedAndInvalidTestEventId)
          },
          {
            arrivalStatus: "remove-from-tracking",
            id: parseInt(farAndInvalidTestEventId)
          },
          {
            arrivalStatus: "remove-from-tracking",
            id: nonExistentEventId
          }
        ]
      }
    })
  })

  it("should persist arrival when checking events", async () => {
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2
    )

    const eventResp = await callCreateEvent(attendeeToken, { ...testEvents[0], ...eventLocation })

    await callSetArrival(attendeeToken, {
      location: eventLocation
    })

    expect(await callGetEvent(attendeeToken, parseInt(eventResp.body.id))).toMatchObject({
      body: {
        arrivalStatus: "arrived"
      }
    })

    await callSetDeparture(attendeeToken, {
      location: eventLocation
    })

    expect(await callGetEvent(attendeeToken, parseInt(eventResp.body.id))).toMatchObject({
      body: {
        arrivalStatus: "not-arrived"
      }
    })
  })

  // test deleted case
  // test already joined case
  // test max limit case, should delete old arrivals
  // test happy path case
})
