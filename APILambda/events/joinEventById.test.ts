import { randomInt } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent, callJoinEvent } from "../test/helpers/events.js"
import {
  callBlockUser,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"

describe("Join the event by id tests", () => {
  resetDatabaseBeforeEach()

  // Happy Path
  it("should return 201 when the user is able to successfully join the event", async () => {
    const eventOwnerToken = await createUserAndUpdateAuth(
      global.defaultUser.auth
    )
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2.auth
    )
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const testEvent = { ...testEvents[0], endTimestamp: futureDate }
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp.status).toEqual(201)
  })

  it("should return 403 when the user is blocked by the event host", async () => {
    const eventOwnerToken = await createUserAndUpdateAuth(
      global.defaultUser.auth
    )
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2.auth
    )
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const testEvent = { ...testEvents[0], endTimestamp: futureDate }
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    await callBlockUser(eventOwnerToken, global.defaultUser2.id)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp.status).toEqual(403)
  })

  it("should return 404 if the event doesn't exist", async () => {
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2.auth
    )
    const eventId = randomInt(1000)
    const resp = await callJoinEvent(attendeeToken, eventId)
    expect(resp.status).toEqual(404)
  })

  it("should return 403 when the event has ended", async () => {
    const eventOwnerToken = await createUserAndUpdateAuth(
      global.defaultUser.auth
    )
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2.auth
    )

    const currentDate = new Date()
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2050-01-01"))

    const testEvent = { ...testEvents[0], endTimestamp: currentDate }
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp.status).toEqual(403)

    jest.useRealTimers()
  })

  it("should return 200 when the user tries to join an event twice", async () => {
    const eventOwnerToken = await createUserAndUpdateAuth(
      global.defaultUser.auth
    )
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2.auth
    )
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const testEvent = { ...testEvents[0], endTimestamp: futureDate }
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    await callJoinEvent(attendeeToken, parseInt(event.body.id))
    const resp = await callJoinEvent(attendeeToken, parseInt(event.body.id))
    expect(resp.status).toEqual(200)
  })
})
