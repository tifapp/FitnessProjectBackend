import { resetDatabaseBeforeEach } from "../test/database.js"
import { callPatchSettings, callPostUser, callGetSettings } from "../test/helpers/users.js"
import { testAuthorizationHeader, mockClaims } from "../test/testVariables.js"
import { userNotFoundBody } from "./getUserBasedOnId.js"

describe("Update Settings tests", () => {
  resetDatabaseBeforeEach()
  // inside of the helper method, transform the id into jwt/mockclaims.sub. From the perspective of the test, should only deal with test users and test user ids.
  it("should 404 when attempting edit settings for non-existent user", async () => {
    const resp = await callPatchSettings(testAuthorizationHeader, { isAnalyticsEnabled: false })
    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(mockClaims.sub))
  })

  it("should be able to retrieve the user's edited settings", async () => {
    await callPostUser(testAuthorizationHeader)
    await callPatchSettings(testAuthorizationHeader, { isChatNotificationsEnabled: false })
    await callPatchSettings(testAuthorizationHeader, { isCrashReportingEnabled: false })

    const resp = await callGetSettings(testAuthorizationHeader)
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
    await callPostUser(testAuthorizationHeader)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = await callPatchSettings(testAuthorizationHeader, { isAnalyticsEnabled: 69, hello: "world" } as any)
    expect(resp.status).toEqual(400)
  })
})
