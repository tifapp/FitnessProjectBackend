import { randomInt, randomUUID } from "crypto"
import { conn } from "../dbconnection"
import { insertEvent } from "../events"
import { determineChatPermissions } from "../events/getChatToken"
import { userNotFoundBody } from "../shared/Responses"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "./database"
import { callCreateEvent, callGetEvent, callGetEventChatToken } from "./helpers/events"
import { callPostUser } from "./helpers/users"
import { testEvents, testUserIdentifier, testUsers } from "./testVariables"

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
  describe("createEvent tests", () => {
    it("does not allow a user to create an event if the user doesn't exist", async () => {
      const id = randomUUID()
      const resp = await callCreateEvent(id, testEvents[0])
      expect(resp.status).toEqual(404)
      expect(resp.body).toEqual(userNotFoundBody(id))
    })

    it("should allow a user to create an event if the user exists", async () => {
      await callPostUser(testUserIdentifier, testUsers[0])
      const resp = await callCreateEvent(testUserIdentifier, testEvents[0])
      expect(resp.status).toEqual(201)
      expect(parseInt(resp.body.id)).not.toBeNaN()
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

  describe("GetTokenRequest tests", () => {
    it("should return 404 if the event doesnt exist", async () => {
      const eventId = randomInt(1000)
      const id = randomUUID()
      const resp = await callGetEventChatToken(id, eventId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject({ body: "event does not exist" })
    })

    it("should return 404 if the user is not part of the event", async () => {
      await callPostUser(testUserIdentifier, testUsers[0])
      const event = await callCreateEvent(testUserIdentifier, testEvents[0])

      const id = randomUUID()
      const resp = await callGetEventChatToken(id, event.body.id)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject({ body: "user is not apart of event" })
    })

    // test all error cases
    // test success case
    // unit test getRole() function
  })
  /*
  inside test:
  const result = await request(app).get("/event/chat/9").set("Authorization", req.id);
  */
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
