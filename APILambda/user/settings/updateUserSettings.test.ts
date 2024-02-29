import {
  callGetSettings,
  callPatchSettings,
  callPostUser
} from "../../test/apiCallers/users.js"
import { withEmptyResponseBody } from "../../test/assertions.js"
import { createUserFlow } from "../../test/userFlows/users.js"

describe("Update Settings tests", () => {
  // it("should 401 when patching settings for a user without a profile", async () => {
  //   const resp = await callPatchSettings(global.defaultUser.auth, {
  //     isAnalyticsEnabled: false
  //   })

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should update the user's settings", async () => {
    const { token } = await createUserFlow()
    const updateResp = await callPatchSettings(token, {
      isChatNotificationsEnabled: false
    })
    expect(withEmptyResponseBody(updateResp)).toMatchObject({
      status: 204,
      body: ""
    })

    const settings1LastUpdatedAt = await callGetSettings(token).then(
      (resp) => new Date(resp.body.lastUpdatedAt)
    )

    const updateResp2 = await callPatchSettings(token, {
      isCrashReportingEnabled: false
    })
    expect(withEmptyResponseBody(updateResp2)).toMatchObject({
      status: 204,
      body: ""
    })

    const settings2Resp = await callGetSettings(token)
    expect(settings2Resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        isAnalyticsEnabled: true,
        isCrashReportingEnabled: false,
        isEventNotificationsEnabled: true,
        isMentionsNotificationsEnabled: true,
        isChatNotificationsEnabled: false,
        isFriendRequestNotificationsEnabled: true,
        lastUpdatedAt: expect.anything()
      })
    })
    const settings2LastUpdatedAt = new Date(settings2Resp.body.lastUpdatedAt)
    expect(settings2LastUpdatedAt.getTime()).toBeGreaterThanOrEqual(
      settings1LastUpdatedAt.getTime()
    )

    const updateResp3 = await callPatchSettings(token, {
      isCrashReportingEnabled: true
    })
    expect(withEmptyResponseBody(updateResp3)).toMatchObject({
      status: 204,
      body: ""
    })

    const settings3Resp = await callGetSettings(token)
    expect(settings3Resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        isAnalyticsEnabled: true,
        isCrashReportingEnabled: true,
        isEventNotificationsEnabled: true,
        isMentionsNotificationsEnabled: true,
        isChatNotificationsEnabled: false,
        isFriendRequestNotificationsEnabled: true,
        lastUpdatedAt: expect.anything()
      })
    })
  })

  it("should 400 for an invalid settings body", async () => {
    const { token } = await createUserFlow()
    await callPostUser(token)
    const resp = await callPatchSettings(token, {
      isAnalyticsEnabled: 69,
      hello: "world"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "invalid-request" }
    })
  })
})
