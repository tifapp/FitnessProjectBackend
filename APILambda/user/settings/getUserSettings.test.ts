import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import { DEFAULT_USER_SETTINGS } from "TiFShared/domain-models/Settings"
import { testAPI } from "../../test/testApp"
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
    const newUser = await createUserFlow()
    const resp = await testAPI.userSettings({ auth: newUser.auth })
    // For Testing
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { eventPresetLocation, ...defaults } = { ...DEFAULT_USER_SETTINGS }
    expect(resp).toMatchObject({
      status: 200,
      data: defaults
    })
  })
})
