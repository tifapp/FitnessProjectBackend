import { UserHandle } from "TiFShared/domain-models/User"
import { testAPI } from "../../test/testApp"
import { jwtBody } from "TiFShared/lib/JWT"

describe("Create User Profile tests", () => {
  // TODO: Move to separate unit test file for auth middleware
  // it("should 401 when no token is passed", async () => {
  //   const resp = await testAPI.createCurrentUserProfile({ auth: "" })

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     data: { error: "invalid-headers" }
  //   })
  // })

  // it("should 401 when user is not verified", async () => {
  //   const user = await global.registerUser({ isVerified: false })
  //   const resp = await testAPI.createCurrentUserProfile({ auth: user.auth })

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     data: { error: "unverified-user" }
  //   })
  // })

  // it("should 401 when user is missing 'name' attribute", async () => {
  //   const user = await global.registerUser({ name: "", profileExists: false })
  //   const resp = await testAPI.createCurrentUserProfile({ auth: user.auth })

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     data: { error: "invalid-claims" }
  //   })
  // })

  // it("should 401 when trying to create a user with an already existing id", async () => {
  //   const user = await global.registerUser({ profileExists: false })
  //   await testAPI.createCurrentUserProfile({ auth: user.auth })
  //   const resp = await testAPI.createCurrentUserProfile({ auth: user.auth })

  //   expect(resp).toMatchObject({
  //     status: 400,
  //     data: { error: "user-exists" }
  //   })
  // })

  // it("should 500 when we cannot generate a user id", async () => {
  //   // how to test this?
  // })

  // it("should 400 when trying to create a user with an already existing profile", async () => {
  //   const resp = await testAPI.createCurrentUserProfile({auth: global.un}registeredUser.auth)

  //   expect(resp).toMatchObject({
  //     status: 400,
  //     body: { error: "user-already-exists" }
  //   })
  // })
  //
  it("should 400 when creating a user with an empty name", async () => {
    const resp = await testAPI.createCurrentUserProfile({ body: { name: "" } })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-name" }
    })
  })

  it("should 201 when creating a user with a name", async () => {
    const resp = await testAPI.createCurrentUserProfile<201>({
      body: { name: "Bitchell Dickle" }
    })
    expect(resp).toMatchObject({
      status: 201,
      data: {
        id: expect.any(String),
        name: "Bitchell Dickle",
        handle: expect.any(String),
        token: expect.any(String)
      }
    })
    expect(jwtBody(resp.data.token)).toMatchObject({
      id: resp.data.id,
      name: "Bitchell Dickle",
      handle: resp.data.handle
    })
  })
})
