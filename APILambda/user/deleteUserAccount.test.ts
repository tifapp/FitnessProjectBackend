import { withEmptyResponseBody } from "../test/assertions.js"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callDeleteSelf, createUserAndUpdateAuth } from "../test/helpers/users.js"

describe("DeleteSelf tests", () => {
  resetDatabaseBeforeEach()

  // it("should 401 on non existing user", async () => {
  //   const resp = await callDeleteSelf(global.defaultUser.auth)

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should give a 204 when you sucessfully delete the user", async () => {
    const token = await createUserAndUpdateAuth(global.defaultUser)
    const resp = await callDeleteSelf(token)

    expect(withEmptyResponseBody(resp)).toMatchObject({
      status: 204,
      body: ""
    })
  })
})
