import { resetDatabaseBeforeEach } from "../test/database.js"
import { callPostUser, callUpdateUserHandle } from "../test/helpers/users.js"
import { generateMockAuthorizationHeader, testAuthorizationHeader } from "../test/testVariables.js"

describe("Update user profile tests", () => {
  resetDatabaseBeforeEach()

  describe("Update user handle tests", () => {
    it("should 200 when updating the handle to a unique handle for a user that exists", async () => {
      await callPostUser(testAuthorizationHeader)
      const userHandle = "handle"
      const resp = await callUpdateUserHandle(testAuthorizationHeader, userHandle)

      expect(resp.status).toEqual(204)
    })

    it("should 400 for an invalid handle", async () => {
      const userHandle = "@#($@(#$R%U*@#("
      const resp = await callUpdateUserHandle(testAuthorizationHeader, userHandle) // Needs to use method from the update user endpoint

      expect(resp.status).toEqual(400)
      expect(resp.body).toMatchObject({ error: "invalid-request" })
    })

    it("should 401 on non existing user", async () => {
      const userHandle = "handle"
      const resp = await callUpdateUserHandle(testAuthorizationHeader, userHandle) // Needs to use method from the update user endpoint

      expect(resp.status).toEqual(401)
      expect(resp.body).toMatchObject({ error: "user-not-found" })
    })

    it("should 404 when user tries to update user handle but it already exists", async () => {
      await callPostUser(testAuthorizationHeader)
      const user2 = await callPostUser(generateMockAuthorizationHeader({}))

      const resp = await callUpdateUserHandle(testAuthorizationHeader, user2.body.handle)

      expect(resp.status).toEqual(401)
      expect(resp.body).toMatchObject({ error: "duplicate-handle" })
    })

    it("should 401 when user tries to update user handle but the user is not verified", async () => {
      const resp = await callUpdateUserHandle(generateMockAuthorizationHeader({ email_verified: false, phone_number_verified: false }), "user-handle")

      expect(resp.status).toEqual(401)
      expect(resp.body).toMatchObject({ error: "unverified-user" })
    })
  })
})
