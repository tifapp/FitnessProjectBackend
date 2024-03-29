import {
  callGetSettings
} from "../../test/apiCallers/users.js"
import { createUserFlow } from "../../test/userFlows/users.js"

describe("Get Settings tests", () => {
  // it("should return 401 when the user has no profile", async () => {
  //   const resp = await callGetSettings(global.defaultUser.auth)
  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should return the default settings when settings not edited", async () => {
    const { token } = await createUserFlow()
    const resp = await callGetSettings(token)
    expect(resp).toMatchObject({
      status: 200,
      body: {
        isAnalyticsEnabled: true,
        isCrashReportingEnabled: true,
        isEventNotificationsEnabled: true,
        isMentionsNotificationsEnabled: true,
        isChatNotificationsEnabled: true,
        isFriendRequestNotificationsEnabled: true
      }
    })
  })
})
