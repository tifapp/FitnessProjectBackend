import { conn } from "TiFBackendUtils"
import { randomUUID } from "crypto"
import { userNotFoundBody } from "../shared/Responses.js"
import { insertUser } from "../user/index.js"
import { resetDatabaseBeforeEach } from "./database.js"
import { callGetUser } from "./helpers/users.js"
import { testAuthorizationHeader, testUsers } from "./testVariables.js"

describe("GetUser tests", () => {
  resetDatabaseBeforeEach()
  it("should 404 on non existing user", async () => {
    const userId = randomUUID()
    const resp = await callGetUser(testAuthorizationHeader, userId)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(userId))
  })

  it("should retrieve a user that exists", async () => {
    await insertUser(conn, testUsers[0])
    const resp = await callGetUser(testAuthorizationHeader, testUsers[0].id)

    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject(
      expect.objectContaining(testUsers[0])
    )
  })
})
