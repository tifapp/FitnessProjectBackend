import { resetDatabaseBeforeEach } from "../test/database.js"
import { callGetSettings, callPostUser } from "../test/helpers/users.js"
import { mockClaims, testAuthorizationHeader } from "../test/testVariables.js"
import { userNotFoundBody } from "./getUserBasedOnId.js"

describe("Get Settings tests", () => {
  resetDatabaseBeforeEach()
  it("should 404 when gettings settings when user does not exist", async () => {
    const resp = await callGetSettings(testAuthorizationHeader)
    expect(resp.status).toEqual(404)
    expect(resp.body).toEqual(userNotFoundBody(mockClaims.sub))
  })

  it("should return the default settings when settings not edited", async () => {
    await callPostUser(testAuthorizationHeader)

    const resp = await callGetSettings(testAuthorizationHeader)
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
})
