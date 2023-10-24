import { resetDatabaseBeforeEach } from "../../test/database.js"
import { callGetSettings, createUserAndUpdateAuth } from "../../test/helpers/users.js"

describe("Get Settings tests", () => {
  resetDatabaseBeforeEach()

  // it("should return 500 when we can't retrieve a user's profile", async () => {
  //   const resp = await callGetSettings(global.unregisteredUser.auth)
  //   expect(resp.status).toEqual(500)
  // })

  it("should return 401 when the user has no profile", async () => {
    const resp = await callGetSettings(global.defaultUser.auth)
    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ error: "user-does-not-exist" })
  })

  it("should return the default settings when settings not edited", async () => {
    const token = await createUserAndUpdateAuth(global.defaultUser.auth)
    const resp = await callGetSettings(token)
    expect(resp.body).toEqual({
      isAnalyticsEnabled: true,
      isCrashReportingEnabled: true,
      isEventNotificationsEnabled: true,
      isMentionsNotificationsEnabled: true,
      isChatNotificationsEnabled: true,
      isFriendRequestNotificationsEnabled: true
    })
    expect(resp.status).toEqual(200)
  })
})
