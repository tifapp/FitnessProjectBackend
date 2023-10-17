import { randomUUID } from "crypto"
import { userNotFoundBody } from "../shared/Responses.js"
import { callGetUser, callPostUser } from "../test/helpers/users.js"

describe("GetUser tests", () => {
  it("should 404 on non existing user", async () => {
    const userId = randomUUID()
    const resp = await callGetUser(global.defaultUser.auth, userId)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(userId))
  })

  it("should retrieve a user that exists", async () => {
    const user2 = await global.registerUser({ name: "John Doe" })
    const user2Profile = (await callPostUser(user2.auth)).body
    const resp = await callGetUser(global.defaultUser.auth, user2Profile.id)

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
