import { callDeleteSelf } from "../test/apiCallers/userEndpoints"
import { withEmptyResponseBody } from "../test/assertions"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("DeleteSelf tests", () => {
  // it("should 401 on non existing user", async () => {
  //   const resp = await callDeleteSelf(global.defaultUser.auth)

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should give a 204 when you sucessfully delete the user", async () => {
    const { token } = await createUserFlow()
    const resp = await callDeleteSelf(token)

    expect(withEmptyResponseBody(resp)).toMatchObject({
      status: 204,
      body: ""
    })
  })
})
