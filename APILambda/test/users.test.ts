import { randomUUID } from "crypto"
import { conn } from "../dbconnection"
import { userNotFoundBody } from "../shared/Responses"
import {
  insertUser
} from "../user"
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach
} from "./database"
import { callDeleteSelf, callGetSelf, callGetSettings, callGetUser, callPatchSettings, callPostFriendRequest, callPostUser } from "./helpers/users"
import { testUserIdentifier, testUsers } from "./testVariables"

describe("Users tests", () => {
  resetDatabaseBeforeEach()

  describe("CheckConstraint tests", () => {
    it("should not allow a handle with non-lowercase alpha numeric characters", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn,
          {
            ...testUsers[0],
            handle: "(*(*&(SJK"
          }
        )
      })
    })

    it("should not allow an empty handle", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn, {
          ...testUsers[0],
          handle: ""
        })
      })
    })
  })

  describe("DeleteSelf tests", () => {
    it("should 404 on non existing user", async () => {
      const resp = await callDeleteSelf(testUserIdentifier)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(testUserIdentifier))
    })

    it("should give a 204 when you sucessfully delete the user", async () => {
      await callPostUser(testUserIdentifier, testUsers[0])

      const resp = await callDeleteSelf(testUserIdentifier)
      expect(resp.status).toEqual(204)
    })
  })

  describe("GetUser tests", () => {
    it("should 404 on non existing user", async () => {
      const userId = randomUUID()
      const resp = await callGetUser(testUserIdentifier, userId)

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(userId))
    })

    it("should retrieve a user that exists", async () => {
      await insertUser(conn, testUsers[0])
      const resp = await callGetUser(testUserIdentifier, testUsers[0].id)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(
        expect.objectContaining(testUsers[0])
      )
    })
  })

  describe("FriendRequest tests", () => {
    beforeEach(async () => {
      await insertUser(conn, testUsers[0])
      await insertUser(conn, testUsers[1])
    })

    it("should have a pending status when no prior relation between uses", async () => {
      const resp = await callPostFriendRequest(testUserIdentifier, testUsers[1].id)
      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ status: "friend-request-pending" })
    })

    it("should return the same status when already existing pending friend request", async () => {
      await callPostFriendRequest(testUserIdentifier, testUsers[1].id)
      const resp = await callPostFriendRequest(testUserIdentifier, testUsers[1].id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({ status: "friend-request-pending" })
    })

    it("should return the same status when already friends", async () => {
      await callPostFriendRequest(testUserIdentifier, testUsers[1].id)
      await callPostFriendRequest(testUsers[1].id, testUserIdentifier)

      const resp = await callPostFriendRequest(testUserIdentifier, testUsers[1].id)
      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject({ status: "friends" })
    })

    it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
      await callPostFriendRequest(testUserIdentifier, testUsers[1].id)

      const resp = await callPostFriendRequest(testUsers[1].id, testUserIdentifier)
      expect(resp.status).toEqual(201)
      expect(resp.body).toMatchObject({ status: "friends" })
    })
  })

  describe("GetSelf tests", () => {
    it("404s when you have no account", async () => {
      const resp = await callGetSelf(testUserIdentifier)
      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(testUserIdentifier))
    })

    it("should be able to fetch your private account info", async () => {
      await callPostUser(testUserIdentifier, testUsers[0])
      const resp = await callGetSelf(testUserIdentifier)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(
        expect.objectContaining({
          ...testUsers[0],
          id: testUserIdentifier,
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
      const resp = await callGetSettings(testUserIdentifier)
      expect(resp.status).toEqual(404)
      expect(resp.body).toEqual(userNotFoundBody(testUserIdentifier))
    })

    it("should return the default settings when settings not edited", async () => {
      await callPostUser(testUserIdentifier, testUsers[0])

      const resp = await callGetSettings(testUserIdentifier)
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
      const resp = await callPatchSettings(testUserIdentifier, { isAnalyticsEnabled: false })
      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(testUserIdentifier))
    })

    it("should be able to retrieve the user's edited settings", async () => {
      await callPostUser(testUserIdentifier, testUsers[0])
      await callPatchSettings(testUserIdentifier, { isChatNotificationsEnabled: false })
      await callPatchSettings(testUserIdentifier, { isCrashReportingEnabled: false })

      const resp = await callGetSettings(testUserIdentifier)
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
      await callPostUser(testUserIdentifier, testUsers[0])
      const resp = await callPatchSettings(testUserIdentifier, { isAnalyticsEnabled: 69, hello: "world" } as any)
      expect(resp.status).toEqual(400)
    })
  })
})
