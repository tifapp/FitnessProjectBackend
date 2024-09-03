import { callGetSettings } from "../../test/apiCallers/userEndpoints"
import { createUserFlow } from "../../test/userFlows/createUserFlow"

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
        isCrashReportingEnabled: true
        // TODO: Update with models from tifshared api
      }
    })
  })
})
