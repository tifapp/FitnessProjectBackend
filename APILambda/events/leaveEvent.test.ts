import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent, callJoinEvent } from "../test/helpers/events.js"
import {
  createUserAndUpdateAuth
} from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"
import { leaveEvent } from "./leaveEvent.js"
import { conn } from "TiFBackendUtils"

describe("Leave the event tests", () => {
  resetDatabaseBeforeEach()

  it("should return 204 if user leaves the event", async () => {
    const eventOwner = global.defaultUser
    const attendee = global.defaultUser2
    const eventOwnerToken = await createUserAndUpdateAuth(eventOwner)
    const attendeeToken = await createUserAndUpdateAuth(attendee)

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const testEvent = { ...testEvents[0], endTimestamp: futureDate }
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    await callJoinEvent(attendeeToken, parseInt(event.body.id))
    const resp = await leaveEvent(conn, attendee.id, event.body.id)

    expect(resp).toMatchObject({
      status: "success",
      value: 204
    })
  })

  it("should return 404 if user leaves an event that doesn't exist", async () => {
    const attendee = global.defaultUser2
    const nonExistingEventId = 1
    const resp = await leaveEvent(conn, attendee.id, nonExistingEventId)

    expect(resp).toMatchObject({
      status: "failure",
      value: 404
    })
  })
})
