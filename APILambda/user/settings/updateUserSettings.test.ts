import { testAPI } from "../../test/testApp"
import { createUserFlow } from "../../test/userFlows/createUserFlow"

describe("Update Settings tests", () => {
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
    const newUser = await createUserFlow()
    const updateResp = await testAPI.saveUserSettings({
      auth: newUser.auth,
      body: {
        isAnalyticsEnabled: false
      }
    })
    expect(updateResp).toMatchObject({
      status: 204,
      data: {}
    })

    const settings1Resp = await testAPI.userSettings({ auth: newUser.auth })

    const updateResp2 = await testAPI.saveUserSettings({
      auth: newUser.auth,
      body: {
        isCrashReportingEnabled: false
      }
    })
    expect(updateResp2).toMatchObject({
      status: 204,
      data: {}
    })

    const settings2Resp = await testAPI.userSettings({ auth: newUser.auth })
    expect(settings2Resp).toMatchObject({
      status: 200,
      data: expect.objectContaining({
        isAnalyticsEnabled: false,
        isCrashReportingEnabled: false,
        // TODO: Update with models from tifshared api
        updatedDateTime: expect.anything()
      })
    })

    expect((settings2Resp.data as any).version).toBeGreaterThanOrEqual(
      (settings2Resp.data as any).version
    )

    const updateResp3 = await testAPI.saveUserSettings({
      auth: newUser.auth,
      body: {
        isCrashReportingEnabled: true
      }
    })
    expect(updateResp3).toMatchObject({
      status: 204,
      data: {}
    })

    const settings3Resp = await testAPI.userSettings({ auth: newUser.auth })
    expect(settings3Resp).toMatchObject({
      status: 200,
      data: expect.objectContaining({
        isAnalyticsEnabled: false,
        isCrashReportingEnabled: true,
        // TODO: Update with models from tifshared api
        updatedDateTime: expect.anything()
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
