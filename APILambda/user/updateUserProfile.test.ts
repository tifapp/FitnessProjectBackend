import { resetDatabaseBeforeEach } from "../test/database.js"
import { callPostUser, callUpdateUserHandle, createUserAndUpdateAuth } from "../test/helpers/users.js"

describe("Update user profile tests", () => {
  resetDatabaseBeforeEach()

  describe("Update user handle tests", () => {
    it("should 200 when updating the handle to a unique handle for a user that exists", async () => {
      const userToken = await createUserAndUpdateAuth(global.defaultUser.auth)
      await callPostUser(userToken)
      const userHandle = "handle"
      const resp = await callUpdateUserHandle(
        userToken,
        userHandle
      )

      expect(resp.status).toEqual(204)
    })

    it("should 400 for an invalid handle", async () => {
      const userToken = await createUserAndUpdateAuth(global.defaultUser.auth)
      const userHandle = "@#($@(#$R%U*@#("
      const resp = await callUpdateUserHandle(
        userToken,
        userHandle
      ) // Needs to use method from the update user endpoint

      expect(resp.status).toEqual(400)
      expect(resp.body).toMatchObject({ error: "invalid-request" })
    })

    it("should 400 when user tries to update user handle but it already exists", async () => {
      const userToken = await createUserAndUpdateAuth(global.defaultUser.auth)
      await callPostUser(userToken)
      const user2 = await global.registerUser()
      const user2Profile = await callPostUser(user2.auth)

      const resp = await callUpdateUserHandle(
        userToken,
        user2Profile.body.handle
      )

      expect(resp.status).toEqual(400)
      expect(resp.body).toMatchObject({ error: "duplicate-handle" })
    })
  })
})
