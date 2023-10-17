import { randomUUID } from "crypto"
import { conn } from "../dbconnection.js"
import { userNotFoundBody } from "../shared/Responses.js"
import {
  insertUser
} from "../user/index.js"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "./database.js"
import { callDeleteSelf, callGetSelf, callGetSettings, callGetUser, callPatchSettings, callPostFriendRequest, callPostUser } from "./helpers/users.js"

describe("Users tests", () => {
  resetDatabaseBeforeEach()

  describe("CheckConstraint tests", () => {
    it("should not allow a handle with non-lowercase alpha numeric characters", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn,
          {
            id: randomUUID(),
            name: "test",
            handle: "(*(*&(SJK"
          }
        )
      })
    })

    it("should not allow an empty handle", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn, {
          id: randomUUID(),
          name: "test",
          handle: ""
        })
      })
    })
  })

  describe("DeleteSelf tests", () => {
    it("should 404 on non existing user", async () => {
      const resp = await callDeleteSelf(global.defaultUser.auth)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(global.defaultUser.id))
    })

    it("should give a 204 when you sucessfully delete the user", async () => {
      await callPostUser(global.defaultUser.auth)

      const resp = await callDeleteSelf(global.defaultUser.auth)
      expect(resp.status).toEqual(204)
    })
  })

  describe("GetUser tests", () => {
    it("should 404 on non existing user", async () => {
      const userId = randomUUID()
      const resp = await callGetUser(global.defaultUser.auth, userId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(userId))
    })

    it("should retrieve a user that exists", async () => {
      const user2 = await global.registerUser({ name: "John Doe" })
      const user2Profile = (await callPostUser(user2.auth)).body
      const resp = await callGetUser(global.defaultUser.auth, user2Profile.id)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(
        expect.objectContaining({ id: user2.id, name: "John Doe", handle: user2Profile.handle })
      )
    })
  })

  describe("FriendRequest tests", () => {
    beforeEach(async () => {
      await callPostUser(global.defaultUser.auth)
      await callPostUser(global.defaultUser2.auth)
    })

    it("should have a pending status when no prior relation between uses", async () => {
      const resp = await callPostFriendRequest(global.defaultUser.auth, global.defaultUser2.id)
      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ status: "friend-request-pending" })
    })

    it("should return the same status when already existing pending friend request", async () => {
      await callPostFriendRequest(global.defaultUser.auth, global.defaultUser2.id)
      const resp = await callPostFriendRequest(global.defaultUser.auth, global.defaultUser2.id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({ status: "friend-request-pending" })
    })

    it("should return the same status when already friends", async () => {
      await callPostFriendRequest(global.defaultUser.auth, global.defaultUser2.id)
      await callPostFriendRequest(global.defaultUser2.auth, global.defaultUser.id)

      const resp = await callPostFriendRequest(global.defaultUser.auth, global.defaultUser2.id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({ status: "friends" })
    })

    it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
      await callPostFriendRequest(global.defaultUser.auth, global.defaultUser2.id)

      const resp = await callPostFriendRequest(global.defaultUser2.auth, global.defaultUser.id)
      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ status: "friends" })
    })
  })

  describe("GetSelf tests", () => {
    it("404s when you have no account", async () => {
      const resp = await callGetSelf(global.defaultUser.auth)
      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(global.defaultUser.id))
    })

    it("should be able to fetch your private account info", async () => {
      await callPostUser(global.defaultUser.auth)
      const resp = await callGetSelf(global.defaultUser.auth)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(
        expect.objectContaining({
          id: global.defaultUser.id,
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
      const resp = await callGetSettings(global.defaultUser.auth)
      expect(resp.status).toEqual(404)
      expect(resp.body).toEqual(userNotFoundBody(global.defaultUser.id))
    })

    it("should return the default settings when settings not edited", async () => {
      await callPostUser(global.defaultUser.auth)

      const resp = await callGetSettings(global.defaultUser.auth)
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

    // inside of the helper method, transform the id into jwt/mockclaims.sub. From the perspective of the test, should only deal with test users and test user ids.
    it("should 404 when attempting edit settings for non-existent user", async () => {
      const resp = await callPatchSettings(global.defaultUser.auth, { isAnalyticsEnabled: false })
      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(global.defaultUser.id))
    })

    it("should be able to retrieve the user's edited settings", async () => {
      await callPostUser(global.defaultUser.auth)
      await callPatchSettings(global.defaultUser.auth, { isChatNotificationsEnabled: false })
      await callPatchSettings(global.defaultUser.auth, { isCrashReportingEnabled: false })

      const resp = await callGetSettings(global.defaultUser.auth)
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
      await callPostUser(global.defaultUser.auth)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await callPatchSettings(global.defaultUser.auth, { isAnalyticsEnabled: 69, hello: "world" } as any)
      expect(resp.status).toEqual(400)
    })
  })
})
