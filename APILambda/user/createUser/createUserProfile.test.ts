import { testAPI } from "../../test/testApp"

describe("Create User Profile tests", () => {
  // TODO: Move to separate unit test file for auth middleware
  it("should 401 when no token is passed", async () => {
    const resp = await testAPI.createCurrentUserProfile()

    expect(resp).toMatchObject({
      status: 401,
      body: { error: "invalid-headers" }
    })
  })

  it("should 401 when user is not verified", async () => {
    const user = await global.registerUser({ isVerified: false })
    const resp = await testAPI.createCurrentUserProfile({ auth: user.auth })

    expect(resp).toMatchObject({
      status: 401,
      body: { error: "unverified-user" }
    })
  })

  it("should 401 when user is missing 'name' attribute", async () => {
    const user = await global.registerUser({ name: "", profileExists: false })
    const resp = await testAPI.createCurrentUserProfile({ auth: user.auth })

    expect(resp).toMatchObject({
      status: 401,
      body: { error: "invalid-claims" }
    })
  })

  it("should 401 when trying to create a user with an already existing id", async () => {
    const user = await global.registerUser({ profileExists: false })
    await testAPI.createCurrentUserProfile({ auth: user.auth })
    const resp = await testAPI.createCurrentUserProfile({ auth: user.auth })

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "user-exists" }
    })
  })

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

  it("should 201 when creating a user with a unique id and handle", async () => {
    const user = await global.registerUser({ profileExists: false })
    const resp = await testAPI.createCurrentUserProfile({ auth: user.auth })

    expect(resp).toMatchObject({
      status: 201,
      body: { id: user.id, handle: expect.anything() }
    })
  })
})
