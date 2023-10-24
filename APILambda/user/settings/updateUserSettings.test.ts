import { resetDatabaseBeforeEach } from "../../test/database.js"
import { callGetSettings, callPatchSettings, callPostUser } from "../../test/helpers/users.js"
import { userNotFoundBody } from "../getUser.js"

describe("Update Settings tests", () => {
  resetDatabaseBeforeEach()

  it("should 404 when attempting edit settings for non-existent user", async () => {
    const resp = await callPatchSettings(global.defaultUser.auth, {
      isAnalyticsEnabled: false
    })
    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(global.defaultUser.id))
  })

  it("should be able to retrieve the user's edited settings", async () => {
    await callPostUser(global.defaultUser.auth)
    await callPatchSettings(global.defaultUser.auth, {
      isChatNotificationsEnabled: false
    })
    await callPatchSettings(global.defaultUser.auth, {
      isCrashReportingEnabled: false
    })

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
    const resp = await callPatchSettings(global.defaultUser.auth, {
      isAnalyticsEnabled: 69,
      hello: "world"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    expect(resp.status).toEqual(400)
  })
})
