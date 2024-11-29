import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import { DEFAULT_USER_SETTINGS } from "TiFShared/domain-models/Settings"
import { testAPI } from "../../test/testApp"
import { createUserFlow } from "../../test/userFlows/createUserFlow"

describe("Update Settings tests", () => {
  // use global middleware
  // it("should 401 when patching settings for a user without a profile", async () => {
  //   const resp = await testAPI.saveUserSettings(global.defaultUser.auth, {
  //     isAnalyticsEnabled: false
  //   })

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should update the user's settings", async () => {
    // For Testing
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { eventPresetLocation, ...defaults } = { ...DEFAULT_USER_SETTINGS }
    const newUser = await createUserFlow()
    const updateResp = await testAPI.saveUserSettings({
      auth: newUser.auth,
      body: {
        isAnalyticsEnabled: false
      }
    })
    expect(updateResp).toMatchObject({
      status: 200,
      data: {
        ...defaults,
        isAnalyticsEnabled: false
      }
    })

    const settings1Resp = await testAPI.userSettings({ auth: newUser.auth })

    const updateResp2 = await testAPI.saveUserSettings({
      auth: newUser.auth,
      body: {
        isCrashReportingEnabled: false
      }
    })
    expect(updateResp2).toMatchObject({
      status: 200,
      data: {
        ...defaults,
        isAnalyticsEnabled: false,
        isCrashReportingEnabled: false,
        version: 1
      }
    })

    const settings2Resp = await testAPI.userSettings({ auth: newUser.auth })
    expect(settings1Resp.data.version).toBeLessThan(settings2Resp.data.version)
    expect(settings2Resp).toMatchObject({
      status: 200,
      data: expect.objectContaining({
        ...defaults,
        isAnalyticsEnabled: false,
        isCrashReportingEnabled: false,
        version: 1
      })
    })

    expect(settings2Resp.data.version).toBeGreaterThanOrEqual(
      settings2Resp.data.version
    )

    const updateResp3 = await testAPI.saveUserSettings({
      auth: newUser.auth,
      body: {
        isCrashReportingEnabled: true
      }
    })
    expect(updateResp3).toMatchObject({
      status: 200,
      data: {
        ...defaults,
        isAnalyticsEnabled: false,
        isCrashReportingEnabled: true,
        version: 2
      }
    })

    const settings3Resp = await testAPI.userSettings({ auth: newUser.auth })
    expect(settings3Resp).toMatchObject({
      status: 200,
      data: expect.objectContaining({
        ...defaults,
        isAnalyticsEnabled: false,
        isCrashReportingEnabled: true,
        version: 2
      })
    })
  })

  it("should 400 for an invalid settings body", async () => {
    const newUser = await createUserFlow()
    const resp = await testAPI.saveUserSettings({
      auth: newUser.auth,
      body: {
        // @ts-expect-error For testing
        isAnalyticsEnabled: 69,
        hello: "world"
      }
    })

    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-request" }
    })
  })
})
