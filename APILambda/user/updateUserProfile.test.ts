import {
  conn
} from "../dbconnection.js"
import { callPostUser, callUpdateUserHandle } from "../test/helpers/users"
import { generateMockToken, mockClaims, testUserIdentifier, testUsers } from "../test/testVariables"
import { insertUser } from "./SQL"
import {
  resetDatabaseBeforeEach
} from "./database"
import { userNotFoundBody } from "./getUserBasedOnId"

describe("Update user profile tests", () => {
  resetDatabaseBeforeEach()

  describe("Update user handle tests", () => {
    it("should 404 on non existing user", async () => {
      const userHandle = "user-handle"
      const resp = await callUpdateUserHandle(testUserIdentifier, userHandle) // Needs to use method from the update user endpoint

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject(userNotFoundBody(mockClaims.sub))
    })

    it("should 404 when user tries to update user handle but it already exists", async () => {
      // Placeholder error code, look up appropriate error code for this case
      await insertUser(conn,
        {
          ...testUsers[0],
          id: mockClaims.sub,
          handle: "abc"
        }
      )
      await insertUser(conn,
        {
          ...testUsers[1],
          handle: "def"
        }
      )

      const resp = await callUpdateUserHandle(testUserIdentifier, "def")

      // userWithHandleExists(conn, "abc");

      expect(resp.status).toEqual(404)
      expect(resp.body).toMatchObject({ status: "error", value: "duplicate-handle" })
    })

    it("should 404 when user tries to update user handle but the user is not verified", async () => {
      const resp = await callUpdateUserHandle(generateMockToken({ ...mockClaims, email_verified: false, phone_number_verified: false }), "user-handle")

      expect(resp.status).toEqual(401)
      expect(resp.body).toMatchObject({ error: "Unauthorized" })
    })
  })
})
