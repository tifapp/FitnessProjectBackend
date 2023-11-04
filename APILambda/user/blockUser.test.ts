import { randomUUID } from "crypto"
import {
  callBlockUser,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"

describe("Block User tests", () => {
  it("should 404 when trying to block a non-existent user", async () => {
    const userId = randomUUID()
    const token1 = await createUserAndUpdateAuth(global.defaultUser.auth)
    const resp = await callBlockUser(token1, userId)
    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject({ error: "user-not-found", userId })
  })
})
