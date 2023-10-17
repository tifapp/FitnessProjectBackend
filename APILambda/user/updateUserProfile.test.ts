import { resetDatabaseBeforeEach } from "../test/database.js"
import { callPostUser, callUpdateUserHandle } from "../test/helpers/users.js"

describe("Update user profile tests", () => {
  resetDatabaseBeforeEach()

  describe("Update user handle tests", () => {
    it("should 200 when updating the handle to a unique handle for a user that exists", async () => {
      await callPostUser(global.defaultUser.auth)
      const userHandle = "handle"
      const resp = await callUpdateUserHandle(global.defaultUser.auth, userHandle)

      expect(resp.status).toEqual(204)
    })

    it("should 400 for an invalid handle", async () => {
      const userHandle = "@#($@(#$R%U*@#("
      const resp = await callUpdateUserHandle(global.defaultUser.auth, userHandle) // Needs to use method from the update user endpoint

      expect(resp.status).toEqual(400)
      expect(resp.body).toMatchObject({ error: "invalid-request" })
    })

    it("should 401 on non existing user", async () => {
      const userHandle = "handle"
      const resp = await callUpdateUserHandle(global.defaultUser.auth, userHandle) // Needs to use method from the update user endpoint

      expect(resp.status).toEqual(401)
      expect(resp.body).toMatchObject({ error: "user-not-found" })
    })

    it("should 404 when user tries to update user handle but it already exists", async () => {
      await callPostUser(global.defaultUser.auth)
      const user2 = await global.registerUser()
      const user2Profile = await callPostUser(user2.auth)

      const resp = await callUpdateUserHandle(global.defaultUser.auth, user2Profile.body.handle)

      expect(resp.status).toEqual(401)
      expect(resp.body).toMatchObject({ error: "duplicate-handle" })
    })

    it("should 401 when user tries to update user handle but the user is not verified", async () => {
      const user = await global.registerUser({ isVerified: false })
      const resp = await callUpdateUserHandle(user.auth, "user-handle")

      expect(resp.status).toEqual(401)
      expect(resp.body).toMatchObject({ error: "unverified-user" })
    })
  })
})
