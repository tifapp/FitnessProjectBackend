import { resetDatabaseBeforeEach } from "../test/database.js"
import { callPostUser, callUpdateUserHandle, createUserAndUpdateAuth } from "../test/helpers/users.js"

describe("Update user profile tests", () => {
  resetDatabaseBeforeEach()

  // add auth middleware tests for profile_exists
  describe("Update user handle tests", () => {
    it("should 200 when updating the handle to a unique handle", async () => {
      const userToken = await createUserAndUpdateAuth(global.defaultUser)
      await callPostUser(userToken)
      const userHandle = "handle"
      const resp = await callUpdateUserHandle(
        userToken,
        userHandle
      )

      expect(resp).toMatchObject({
        status: 204,
        body: {}
      })
    })

    it("should 400 for an invalid handle", async () => {
      const userToken = await createUserAndUpdateAuth(global.defaultUser)
      await callPostUser(userToken)
      const userHandle = "@#($@(#$R%U*@#("
      const resp = await callUpdateUserHandle(
        userToken,
        userHandle
      )

      expect(resp).toMatchObject({
        status: 400,
        body: { error: "invalid-request" }
      })
    })

    it("should 400 when user tries to update user handle but another user has already taken it", async () => {
      const userToken = await createUserAndUpdateAuth(global.defaultUser)
      await callPostUser(userToken)
      const user2 = await global.registerUser()
      const user2Profile = await callPostUser(user2.auth)

      const resp = await callUpdateUserHandle(
        userToken,
        user2Profile.body.handle
      )

      expect(resp).toMatchObject({
        status: 400,
        body: { error: "duplicate-handle" }
      })
    })
  })
})
