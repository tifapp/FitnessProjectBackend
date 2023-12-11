import { resetDatabaseBeforeEach } from "../test/database.js"
import { callPostUser } from "../test/helpers/users.js"

describe("Create User Profile tests", () => {
  resetDatabaseBeforeEach()

  // TODO: Move to separate unit test file for auth middleware
  it("should 401 when no token is passed", async () => {
    const resp = await callPostUser()

    expect(resp).toMatchObject({
      status: 401,
      body: { error: "invalid-headers" }
    })
  })

  it("should 401 when user is not verified", async () => {
    const user = await global.registerUser({ isVerified: false })
    const resp = await callPostUser(user.auth)

    expect(resp).toMatchObject({
      status: 401,
      body: { error: "unverified-user" }
    })
  })

  it("should 401 when user is missing 'name' attribute", async () => {
    const user = await global.registerUser({ name: "", profileExists: false })
    const resp = await callPostUser(user.auth)

    expect(resp).toMatchObject({
      status: 401,
      body: { error: "invalid-claims" }
    })
  })

  it("should 401 when trying to create a user with an already existing id", async () => {
    await callPostUser(global.defaultUser.auth)
    const resp = await callPostUser(global.defaultUser.auth)

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "user-exists" }
    })
  })

  // it("should 500 when we cannot generate a user id", async () => {
  //   // how to test this?
  // })

  it("should 400 when trying to create a user with an already existing profile", async () => {
    const resp = await callPostUser(global.unregisteredUser.auth)

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "user-already-exists" }
    })
  })

  it("should 201 when creating a user with a unique id and handle", async () => {
    const resp = await callPostUser(global.defaultUser.auth)

    expect(resp).toMatchObject({
      status: 201,
      body: { id: global.defaultUser.id, handle: expect.anything() }
    })
  })
})
