import { randomInt, randomUUID } from "crypto"
import { conn } from "../dbconnection"
import { insertEvent } from "../events"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "./database"
import { createTestEvent, getTestEvent, getTestEventChatToken } from "./helpers/events"
import { registerUser } from "./helpers/users"
import { mockLocationCoordinate2D } from "./mockData"
import { createTestApp } from "./testApp"
import { determineChatPermissions } from "../events/getChatToken"
import { userNotFoundBody } from "../shared/Responses"

describe("Events tests", () => {
  const app = createTestApp({ conn })
  resetDatabaseBeforeEach()

  describe("Insert event CheckConstraint test", () => {
    it("does not allow the end date to be before the start date", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertEvent(
          conn,
          {
            title: "no",
            description: "yay",
            startTimestamp: new Date(1000),
            endTimestamp: new Date(0),
            color: "#72B01D",
            shouldHideAfterStartDate: true,
            isChatEnabled: true,
            ...mockLocationCoordinate2D()
          },
          randomUUID()
        )
      })
    })
  })
  describe("createEvent tests", () => {
    it("does not allow a user to create an event if the user doesn't exist", async () => {
      const id = randomUUID()
      const resp = await createTestEvent(app, id, {
        title: "no",
        description: "yay",
        startTimestamp: new Date(0),
        endTimestamp: new Date(1000),
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...mockLocationCoordinate2D()
      })
      expect(resp.status).toEqual(404)
      expect(resp.body).toEqual(userNotFoundBody(id))
    })

    it("should allow a user to create an event if the user exists", async () => {
      const hostId = randomUUID()
      await registerUser(app, {
        id: hostId,
        name: "name",
        handle: "handle"
      })
      const resp = await createTestEvent(app, hostId, {
        title: "no",
        description: "yay",
        startTimestamp: new Date(0),
        endTimestamp: new Date(1000),
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...mockLocationCoordinate2D()
      })
      expect(resp.status).toEqual(201)
      expect(parseInt(resp.body.id)).not.toBeNaN()
    })
  })

  describe("GetSingleEvent tests", () => {
    it("should return 404 if the event doesnt exist", async () => {
      const eventId = randomInt(1000)
      const userId = randomUUID()
      const resp = await getTestEvent(app, userId, eventId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject({ error: "event-not-found", eventId })
    })

    it("should return an event if it exists in the db", async () => {
      const hostId = randomUUID()
      const coordinate = mockLocationCoordinate2D()
      const startDate = "2023-11-14T22:13:20.000Z"
      const endDate = "2023-11-14T22:30:00.000Z"
      await registerUser(app, {
        id: hostId,
        name: "name",
        handle: "handle"
      })
      const event = await createTestEvent(app, hostId, {
        title: "no",
        description: "yay",
        startTimestamp: new Date(startDate),
        endTimestamp: new Date(endDate),
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...coordinate
      })

      const resp = await getTestEvent(app, hostId, event.body.id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({
        id: event.body.id,
        title: "no",
        description: "yay",
        startTimestamp: "2023-11-15T06:13:20.000Z",
        endTimestamp: "2023-11-15T06:30:00.000Z",
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...coordinate
      })
    })
  })

  describe("GetTokenRequest tests", () => {
    it("should return 404 if the event doesnt exist", async () => {
      const eventId = randomInt(1000)
      const id = randomUUID()
      const resp = await getTestEventChatToken(app, id, eventId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject({ body: "event does not exist" })
    })

    it("should return 404 if the user is not part of the event", async () => {
      const id = randomUUID()
      await registerUser(app, {
        id,
        name: "name",
        handle: "handle"
      })
      const event = await createTestEvent(app, id, {
        title: "no",
        description: "yay",
        startTimestamp: new Date(0),
        endTimestamp: new Date(1000),
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...mockLocationCoordinate2D()
      })

      const resp = await getTestEventChatToken(app, id, event.body.id)

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
    const endTimestamp = new Date("2023-09-15T12:00:00Z")
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
    const endTimestamp = new Date("2023-09-15T12:00:00Z") // Past date
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
    const endTimestamp = new Date("2022-09-15T12:00:00Z") // Future date
    const eventId = 3

    const result = determineChatPermissions(hostId, endTimestamp, userId, eventId)

    expect(result).toEqual({
      3: ["history", "subscribe"],
      "3-pinned": ["history", "subscribe"]
    })
  })
})
