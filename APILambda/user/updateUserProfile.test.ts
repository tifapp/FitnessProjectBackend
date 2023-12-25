import { callGetSelf, callUpdateUserHandle, callUpdateUserName } from "../test/apiCallers/users.js"
import { withEmptyResponseBody } from "../test/assertions.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Update user profile tests", () => {
  // add auth middleware tests for profile_exists
  describe("Update user handle tests", () => {
    it("should allow users to update their name", async () => {
      const { token: userToken, userId } = await createUserFlow()
      const name = "new name"
      const resp = await callUpdateUserName(
        userToken,
        "new name"
      )

      expect(withEmptyResponseBody(resp)).toMatchObject({
        status: 204,
        body: ""
      })

      expect(await callGetSelf(userToken)).toMatchObject({
        status: 200,
        body: {
          id: userId,
          name
        }
      })
    })

    it("should allow users to update their handle to a unique handle", async () => {
      const { token: userToken, userId } = await createUserFlow()
      const userHandle = "handle"
      const resp = await callUpdateUserHandle(
        userToken,
        userHandle
      )

      expect(withEmptyResponseBody(resp)).toMatchObject({
        status: 204,
        body: ""
      })

      expect(await callGetSelf(userToken)).toMatchObject({
        status: 200,
        body: {
          id: userId,
          handle: userHandle
        }
      })
    })

    it("should 400 for an invalid handle", async () => {
      const { token: userToken } = await createUserFlow()
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
      const { token: userToken } = await createUserFlow()
      const { handle: takenHandle } = await createUserFlow()

      const resp = await callUpdateUserHandle(
        userToken,
        takenHandle
      )

      expect(resp).toMatchObject({
        status: 400,
        body: { error: "duplicate-handle" }
      })
    })
  })
})
