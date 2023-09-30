import {
  conn
} from "../dbconnection.js"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callUpdateUserHandle } from "../test/helpers/users.js"
import { mockClaims, testUserIdentifier, testUsers } from "../test/testVariables.js"
import { insertUser } from "./SQL.js"
import { userNotFoundBody } from "./getUserBasedOnId.js"

describe("Update user profile tests", () => {
  resetDatabaseBeforeEach()

  describe("Update user handle tests", () => {
    it("should 200 when updating the handle to a unique handle for a user that exists", async () => {
      await insertUser(conn,
        {
          ...testUsers[0],
          id: mockClaims.sub,
          handle: "firsthandle"
        }
      )
      const userHandle = "secondhandle"
      const resp = await callUpdateUserHandle(testUserIdentifier, userHandle)

      expect(resp.status).toEqual(200)
      expect(resp.body).toMatchObject(userNotFoundBody(mockClaims.sub))
    })

    // it("should 404 on non existing user", async () => {
    //   const userHandle = "user-handle"
    //   const resp = await callUpdateUserHandle(testUserIdentifier, userHandle) // Needs to use method from the update user endpoint

    //   expect(resp.status).toEqual(404)
    //   expect(resp.body).toMatchObject(userNotFoundBody(mockClaims.sub))
    // })

    // it("should 404 when user tries to update user handle but it already exists", async () => {
    //   // Placeholder error code, look up appropriate error code for this case
    //   await insertUser(conn,
    //     {
    //       ...testUsers[0],
    //       id: mockClaims.sub,
    //       handle: "abc"
    //     }
    //   )
    //   await insertUser(conn,
    //     {
    //       ...testUsers[1],
    //       handle: "def"
    //     }
    //   )

    //   const resp = await callUpdateUserHandle(testUserIdentifier, "def")

    //   // userWithHandleExists(conn, "abc");

    //   expect(resp.status).toEqual(404)
    //   expect(resp.body).toMatchObject({ status: "error", value: "duplicate-handle" })
    // })

    // it("should 404 when user tries to update user handle but the user is not verified", async () => {
    //   const resp = await callUpdateUserHandle(generateMockToken({ ...mockClaims, email_verified: false, phone_number_verified: false }), "user-handle")

    //   expect(resp.status).toEqual(401)
    //   expect(resp.body).toMatchObject({ error: "Unauthorized" })
    // })
  })
})
