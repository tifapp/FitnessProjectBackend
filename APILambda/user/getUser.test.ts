import { randomUUID } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database.js"
import {
  callGetSelf,
  callGetUser,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"

describe("GetUser tests", () => {
  resetDatabaseBeforeEach()

  it("should 401 on non existing user", async () => {
    const userId = randomUUID()
    const resp = await callGetUser(global.defaultUser.auth, userId)

    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ error: "user-does-not-exist" })
  })

  it("should retrieve a user that exists", async () => {
    const user1Token = await createUserAndUpdateAuth(global.defaultUser.auth)

    const user2 = await global.registerUser({ name: "John Doe" })
    const user2Token = await createUserAndUpdateAuth(user2.auth)
    const user2Profile = (await callGetSelf(user2Token)).body
    const resp = await callGetUser(user1Token, user2.id)

    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject(
      expect.objectContaining({
        id: user2.id,
        name: "John Doe",
        handle: user2Profile.handle
      })
    )
  })
})
