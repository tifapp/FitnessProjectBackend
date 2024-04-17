import {
  callGetSettings,
  callPatchSettings,
  callPostUser
} from "../../test/apiCallers/users.js"
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
    expect(updateResp).toMatchObject(expectedUpdateResponse())

    const settings1UpdatedDateTime = new Date(updateResp.body.updatedDateTime)
    const updateResp2 = await callPatchSettings(token, {
      isCrashReportingEnabled: false
    })
    expect(updateResp2).toMatchObject(expectedUpdateResponse())

    const settings2Resp = await callGetSettings(token)
    expect(settings2Resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        isAnalyticsEnabled: true,
        isCrashReportingEnabled: false,
        isEventNotificationsEnabled: true,
        isMentionsNotificationsEnabled: true,
        isChatNotificationsEnabled: false,
        isFriendRequestNotificationsEnabled: true
      })
    })
    const settings2UpdatedDateTime = new Date(
      settings2Resp.body.updatedDateTime
    )
    expect(settings2UpdatedDateTime.getTime()).toBeGreaterThanOrEqual(
      settings1UpdatedDateTime.getTime()
    )

    expect(settings2UpdatedDateTime).toEqual(
      new Date(updateResp2.body.updatedDateTime)
    )
  })

  const expectedUpdateResponse = () => ({
    status: 200,
    body: { updatedDateTime: expect.any(String) }
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
