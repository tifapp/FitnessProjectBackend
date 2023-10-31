import { resetDatabaseBeforeEach } from "../../test/database.js"
import { callGetSettings, callPatchSettings, callPostUser, createUserAndUpdateAuth } from "../../test/helpers/users.js"

describe("Update Settings tests", () => {
  resetDatabaseBeforeEach()

  // it("should 500 when failing to patch settings for a user", async () => {
  //   const resp = await callPatchSettings(global.unregisteredUser.auth, {
  //     isAnalyticsEnabled: false
  //   })
  //   expect(resp.status).toEqual(500)
  // })

  it("should 401 when patching settings for a user without a profile", async () => {
    const resp = await callPatchSettings(global.defaultUser.auth, {
      isAnalyticsEnabled: false
    })
    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ error: "user-does-not-exist" })
  })

  it("should update the user's settings", async () => {
    const token = await createUserAndUpdateAuth(global.defaultUser.auth)
    const updateResp = await callPatchSettings(token, {
      isChatNotificationsEnabled: false
    })
    expect(updateResp.status).toEqual(204)
    const updateResp2 = await callPatchSettings(token, {
      isCrashReportingEnabled: false
    })
    expect(updateResp2.status).toEqual(204)

    const resp = await callGetSettings(token)
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
    const token = await createUserAndUpdateAuth(global.defaultUser.auth)
    await callPostUser(token)
    const resp = await callPatchSettings(token, {
      isAnalyticsEnabled: 69,
      hello: "world"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    expect(resp.status).toEqual(400)
  })
})