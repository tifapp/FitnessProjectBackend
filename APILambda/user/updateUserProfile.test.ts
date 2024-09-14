import { UserHandle } from "TiFShared/domain-models/User"
import { testAPI } from "../test/testApp"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("Update user profile tests", () => {
  // add auth middleware tests for profile_exists
  describe("Update user handle tests", () => {
    it("should allow users to update their name", async () => {
      const newUser = await createUserFlow()
      const newName = "new name"
      const resp = await testAPI.updateCurrentUserProfile({
        auth: newUser.auth,
        body: {
          name: newName
        }
      })

      expect(resp).toMatchObject({
        status: 204,
        data: {}
      })

      await expect(testAPI.getSelf({
        auth: newUser.auth
      })).resolves.toMatchObject({
        status: 200,
        data: {
          id: newUser.id,
          name: newName
        }
      })
    })

    it("should allow users to update their handle to a unique handle", async () => {
      const newUser = await createUserFlow()
      const newHandle = "handle"
      const resp = await testAPI.updateCurrentUserProfile({
        auth: newUser.auth,
        body: {
          handle: UserHandle.optionalParse(newHandle)!
        }
      })

      expect(resp).toMatchObject({
        status: 204,
        data: {}
      })

      await expect(testAPI.getSelf({
        auth: newUser.auth
      })).resolves.toMatchObject({
        status: 200,
        data: {
          id: newUser.id,
          handle: newHandle
        }
      })
    })

    it("should 400 for an invalid handle", async () => {
      const newUser = await createUserFlow()
      const resp = await testAPI.updateCurrentUserProfile({
        auth: newUser.auth,
        body: {
          // need to test if invalid handles throw errors
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          handle: "@#($@(#$R%U*@#("
        }
      })

      expect(resp).toMatchObject({
        status: 400,
        data: { error: "invalid-request" }
      })
    })

    it("should 400 when user tries to update user handle but another user has already taken it", async () => {
      const newUser = await createUserFlow()
      const oldUser = await createUserFlow()

      const resp = await testAPI.updateCurrentUserProfile({
        auth: newUser.auth,
        body: {
          handle: UserHandle.optionalParse(oldUser.handle)!
        }
      })

      expect(resp).toMatchObject({
        status: 400,
        data: { error: "duplicate-handle" }
      })
    })
  })
})
