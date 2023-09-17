import { randomInt, randomUUID } from "crypto"
import { conn } from "../dbconnection"
import { insertEvent } from "../events"
import { determineChatPermissions } from "../events/getChatToken"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "./database"
import { callGetEvent } from "./helpers/events"
import { testEvents, testUserIdentifier } from "./testVariables"

describe("Events tests", () => {
  resetDatabaseBeforeEach()

  describe("Insert event CheckConstraint test", () => {
    it("does not allow the end date to be before the start date", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertEvent(
          conn,
          {
            ...testEvents[0],
            startTimestamp: new Date(1000),
            endTimestamp: new Date(0)
          },
          randomUUID()
        )
      })
    })
  })

  describe("GetSingleEvent tests", () => {
    it("should return 404 if the event doesnt exist", async () => {
      const eventId = randomInt(1000)
      const resp = await callGetEvent(testUserIdentifier, eventId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject({ error: "event-not-found", eventId })
    })

    // TODO: Timezone issues in CI
    // it("should return an event if it exists in the db", async () => {
    //   await callPostUser(testUserIdentifier, testUsers[0])
    //   const event = await callCreateEvent(testUserIdentifier, testEvents[0])

    //   const resp = await callGetEvent(testUserIdentifier, event.body.id)
    //   expect(resp.status).toEqual(200)
    //   expect(resp.body).toMatchObject(testEvents[0])
    // })
  })
})

describe("determineChatPermissions", () => {
  it("should return admin permissions for a host user", () => {
    const hostId = "1234"
    const userId = "1234"
    const endTimestamp = new Date() // Current Date
    endTimestamp.setFullYear(endTimestamp.getFullYear() + 1)
    const eventId = 1

    const result = determineChatPermissions(hostId, endTimestamp, userId, eventId)

    expect(result).toEqual({
      1: ["history", "subscribe", "publish"],
      "1-pinned": ["history", "subscribe", "publish"]
    })
  })

  it("should return attendee permissions for a non-host user before the event end date", () => {
    const hostId = "1234"
    const userId = "5678"
    const endTimestamp = new Date() // Current Date
    endTimestamp.setFullYear(endTimestamp.getFullYear() + 1)
    const eventId = 2

    const result = determineChatPermissions(hostId, endTimestamp, userId, eventId)

    expect(result).toEqual({
      2: ["history", "subscribe", "publish"],
      "2-pinned": ["history", "subscribe"]
    })
  })

  it("should return viewer permissions for a non-host user after the event end date", () => {
    const hostId = "1234"
    const userId = "5678"
    const endTimestamp = new Date("2022-09-15T12:00:00Z") // Past date
    const eventId = 3

    const result = determineChatPermissions(hostId, endTimestamp, userId, eventId)

    expect(result).toEqual({
      3: ["history", "subscribe"],
      "3-pinned": ["history", "subscribe"]
    })
  })
})
