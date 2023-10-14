import { randomUUID } from "crypto"
import { conn } from "../dbconnection.js"
import { userNotFoundBody } from "../shared/Responses.js"
import {
  insertUser, sendFriendRequest
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
            ...global.testUsers[0].profile,
            handle: "(*(*&(SJK"
          }
        )
      })
    })

    it("should not allow an empty handle", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn, {
          ...global.testUsers[0].profile,
          handle: ""
        })
      })
    })
  })

  describe("DeleteSelf tests", () => {
    it("should 404 on non existing user", async () => {
      const resp = await callDeleteSelf(global.testUsers[0].authorization)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(global.testUsers[0].profile.id))
    })

    it("should give a 204 when you sucessfully delete the user", async () => {
      await callPostUser(global.testUsers[0].authorization)

      const resp = await callDeleteSelf(global.testUsers[0].authorization)
      expect(resp.status).toEqual(204)
    })
  })

  describe("GetUser tests", () => {
    it("should 404 on non existing user", async () => {
      const userId = randomUUID()
      const resp = await callGetUser(global.testUsers[0].authorization, userId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(userId))
    })

    it("should retrieve a user that exists", async () => {
      await callPostUser(global.testUsers[1].authorization)
      const resp = await callGetUser(global.testUsers[0].authorization, global.testUsers[1].profile.id)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(
        expect.objectContaining(global.testUsers[1].profile)
      )
    })
  })

  describe("FriendRequest tests", () => {
    beforeEach(async () => {
      await insertUser(conn, global.testUsers[0].profile)
      await insertUser(conn, global.testUsers[1].profile)
    })

    it("should have a pending status when no prior relation between uses", async () => {
      const resp = await callPostFriendRequest(global.testUsers[0].authorization, global.testUsers[1].profile.id)
      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ status: "friend-request-pending" })
    })

    it("should return the same status when already existing pending friend request", async () => {
      await callPostFriendRequest(global.testUsers[0].authorization, global.testUsers[1].profile.id)
      const resp = await callPostFriendRequest(global.testUsers[0].authorization, global.testUsers[1].profile.id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({ status: "friend-request-pending" })
    })

    it("should return the same status when already friends", async () => {
      await sendFriendRequest(conn, global.testUsers[0].authorization, global.testUsers[1].profile.id)
      await sendFriendRequest(conn, global.testUsers[1].profile.id, global.testUsers[0].authorization)

      const resp = await callPostFriendRequest(global.testUsers[0].authorization, global.testUsers[1].profile.id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({ status: "friends" })
    })

    it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
      await sendFriendRequest(conn, global.testUsers[0].authorization, global.testUsers[1].profile.id)

      const resp = await callPostFriendRequest(global.testUsers[1].profile.id, global.testUsers[0].authorization)
      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ status: "friends" })
    })
  })

  describe("GetSelf tests", () => {
    it("404s when you have no account", async () => {
      const resp = await callGetSelf(global.testUsers[0].authorization)
      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(global.testUsers[0].profile.id))
    })

    it("should be able to fetch your private account info", async () => {
      await callPostUser(global.testUsers[0].authorization)
      const resp = await callGetSelf(global.testUsers[0].authorization)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(
        expect.objectContaining({
          id: global.testUsers[0].profile.id,
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
      const resp = await callGetSettings(global.testUsers[0].authorization)
      expect(resp.status).toEqual(404)
      expect(resp.body).toEqual(userNotFoundBody(global.testUsers[0].profile.id))
    })

    it("should return the default settings when settings not edited", async () => {
      await callPostUser(global.testUsers[0].authorization)

      const resp = await callGetSettings(global.testUsers[0].authorization)
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
      const resp = await callPatchSettings(global.testUsers[0].authorization, { isAnalyticsEnabled: false })
      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(global.testUsers[0].profile.id))
    })

    it("should be able to retrieve the user's edited settings", async () => {
      await callPostUser(global.testUsers[0].authorization)
      await callPatchSettings(global.testUsers[0].authorization, { isChatNotificationsEnabled: false })
      await callPatchSettings(global.testUsers[0].authorization, { isCrashReportingEnabled: false })

      const resp = await callGetSettings(global.testUsers[0].authorization)
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
      await callPostUser(global.testUsers[0].authorization)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = await callPatchSettings(global.testUsers[0].authorization, { isAnalyticsEnabled: 69, hello: "world" } as any)
      expect(resp.status).toEqual(400)
    })
  })
})
