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

  it("should 204 when successful block", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser.auth)
    await createUserAndUpdateAuth(global.defaultUser2.auth)
    const resp = await callBlockUser(token1, global.defaultUser2.id)
    expect(resp.status).toEqual(204)
  })
})
