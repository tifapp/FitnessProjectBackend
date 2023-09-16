import { randomUUID } from "crypto"
import request from "supertest"
import { conn } from "../dbconnection"
import { userNotFoundBody } from "../shared/Responses"
import {
  insertUser
} from "../user"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "./database"
import { deleteSelf, editSettings, fetchSelf, fetchSettings, fetchUser, friendUser, registerUser } from "./helpers/users"
import { createTestApp } from "./testApp"

describe("Users tests", () => {
  const app = createTestApp({ conn })
  resetDatabaseBeforeEach()

  describe("CheckConstraint tests", () => {
    it("should not allow a handle with non-lowercase alpha numeric characters", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn, {
          id: randomUUID(),
          name: "Big Chungus",
          handle: "(*(*&(SJK"
        })
      })
    })

    it("should not allow an empty handle", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn, {
          id: randomUUID(),
          name: "Big Chungus",
          handle: ""
        })
      })
    })
  })

  describe("DeleteSelf tests", () => {
    it("should 404 on non existing user", async () => {
      const userId = randomUUID()
      const resp = await deleteSelf(app, userId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(userId))
    })

    it("should give a 204 when you sucessfully delete the user", async () => {
      const userId = randomUUID()
      await registerUser(app, {
        id: userId,
        name: "Big Chungus",
        handle: "big_chungus"
      })

      const resp = await deleteSelf(app, userId)
      expect(resp.status).toEqual(204)
    })
  })

  describe("GetUser tests", () => {
    it("should 404 on non existing user", async () => {
      const userId = randomUUID()
      const youId = randomUUID()
      const resp = await fetchUser(app, youId, userId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(userId))
    })

    it("should retrieve a user that exists", async () => {
      const userId = randomUUID()
      const youId = randomUUID()
      await registerUser(app, {
        id: userId,
        name: "John Burke",
        handle: "johncann"
      })
      const resp = await fetchUser(app, youId, userId)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(
        expect.objectContaining({
          id: userId,
          name: "John Burke",
          handle: "johncann",
          bio: null,
          updatedAt: null,
          profileImageURL: null,
          relation: "not-friends"
        })
      )
    })
  })

  describe("CreateUser tests", () => {
    it("should 400 on invalid request body", async () => {
      request(app)
        .post("/user")
        .set("Authorization", randomUUID())
        .send({
          name: 1,
          handle: "iusdbdkjbsjbdjsbdsdsudbusybduysdusdudbsuyb"
        })
        .expect(400)
    })

    it("should be able to create a new user posting to /user when user does not exist", async () => {
      const userId = randomUUID()
      const resp = await registerUser(app, {
        id: userId,
        name: "Big Chungus",
        handle: "big_chungus"
      })

      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ id: userId })
    })

    it("should not be able to create a user with an already existing id", async () => {
      const userId = randomUUID()
      await registerUser(app, {
        id: userId,
        name: "Big Chungus",
        handle: "big_chungus"
      })

      const resp = await registerUser(app, {
        id: userId,
        name: "Elon Musk",
        handle: "elon_musk"
      })
      expect(resp.status).toEqual(400)
      expect(resp.body).toMatchObject({ error: "user-already-exists" })
    })

    it("should not be able to create a user with a duplicate handle", async () => {
      await registerUser(app, {
        id: randomUUID(),
        name: "Big Chungus",
        handle: "big_chungus"
      })

      const resp = await registerUser(app, {
        id: randomUUID(),
        name: "Elon Musk",
        handle: "big_chungus"
      })
      expect(resp.status).toEqual(400)
      expect(resp.body).toMatchObject({ error: "duplicate-handle" })
    })
  })

  describe("FriendRequest tests", () => {
    const otherId = randomUUID()
    const youId = randomUUID()

    beforeEach(async () => {
      await registerUser(app, { id: youId, name: "Elon Musk", handle: "elon_musk" })
      await registerUser(app, { id: otherId, name: "A", handle: "a" })
    })

    it("should have a pending status when no prior relation between uses", async () => {
      const resp = await friendUser(app, youId, otherId)
      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ status: "friend-request-pending" })
    })

    it("should return the same status when already existing pending friend request", async () => {
      await friendUser(app, youId, otherId)
      const resp = await friendUser(app, youId, otherId)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({ status: "friend-request-pending" })
    })

    it("should return the same status when already friends", async () => {
      await friendUser(app, youId, otherId)
      await friendUser(app, otherId, youId)

      const resp = await friendUser(app, youId, otherId)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({ status: "friends" })
    })

    it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
      await friendUser(app, youId, otherId)

      const resp = await friendUser(app, otherId, youId)
      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ status: "friends" })
    })
  })

  describe("GetSelf tests", () => {
    it("404s when you have no account", async () => {
      const id = randomUUID()
      const resp = await fetchSelf(app, id)
      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(id))
    })

    it("should be able to fetch your private account info", async () => {
      const id = randomUUID()
      const accountInfo = {
        id,
        name: "Matthew Hayes",
        handle: "little_chungus"
      }
      await registerUser(app, accountInfo)
      const resp = await fetchSelf(app, id)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(
        expect.objectContaining({
          ...accountInfo,
          bio: null,
          updatedAt: null,
          profileImageURL: null
        })
      )
      expect(Date.parse(resp.body.creationDate)).not.toBeNaN()
    })
  })

  describe("Settings tests", () => {
    it("should 404 when gettings settings when user does not exist", async () => {
      const id = randomUUID()
      const resp = await fetchSettings(app, id)
      expect(resp.status).toEqual(404)
      expect(resp.body).toEqual(userNotFoundBody(id))
    })

    it("should return the default settings when settings not edited", async () => {
      const id = await registerTestUser()

      const resp = await fetchSettings(app, id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toEqual({
        isAnalyticsEnabled: true,
        isCrashReportingEnabled: true,
        isEventNotificationsEnabled: true,
        isMentionsNotificationsEnabled: true,
        isChatNotificationsEnabled: true,
        isFriendRequestNotificationsEnabled: true
      })
    })

    it("should 404 when attempting edit settings for non-existent user", async () => {
      const id = randomUUID()
      const resp = await editSettings(app, id, { isAnalyticsEnabled: false })
      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(id))
    })

    it("should be able to retrieve the user's edited settings", async () => {
      const id = await registerTestUser()
      await editSettings(app, id, { isChatNotificationsEnabled: false })
      await editSettings(app, id, { isCrashReportingEnabled: false })

      const resp = await fetchSettings(app, id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({
        isAnalyticsEnabled: true,
        isCrashReportingEnabled: false,
        isEventNotificationsEnabled: true,
        isMentionsNotificationsEnabled: true,
        isChatNotificationsEnabled: false,
        isFriendRequestNotificationsEnabled: true
      })
    })

    it("should 400 invalid settings body when updating settings", async () => {
      const id = await registerTestUser()
      const resp = await request(app)
        .patch("/user/self/settings")
        .set("Authorization", id)
        .send({ isAnalyticsEnabled: 69, hello: "world" })
      expect(resp.status).toEqual(400)
    })

    const registerTestUser = async () => {
      const id = randomUUID()
      await registerUser(app, { id, name: "test", handle: "test" })
      return id
    }
  })
})
