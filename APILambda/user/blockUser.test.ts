import { randomUUID } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database.js"
import {
  callBlockUser,
  callGetUser,
  callPostFriendRequest,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"

describe("Block User tests", () => {
  resetDatabaseBeforeEach()

  it("should 404 when trying to block a non-existent user", async () => {
    const userId = randomUUID()
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    const resp = await callBlockUser(token1, userId)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "user-not-found", userId }
    })
  })

  it("should 204 when successful block", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    await createUserAndUpdateAuth(global.defaultUser2)
    const resp = await callBlockUser(token1, global.defaultUser2.id)

    expect(resp).toMatchObject({
      status: 204,
      body: {}
    })
  })

  it("should remove relation status of blocked user to you when blocking", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    const token2 = await createUserAndUpdateAuth(global.defaultUser2)
    await callPostFriendRequest(token2, global.defaultUser.id)
    await callBlockUser(token1, global.defaultUser2.id)

    const resp = await callGetUser(token1, global.defaultUser2.id)

    expect(resp).toMatchObject({
      body: expect.objectContaining({
        relations: {
          youToThem: "blocked",
          themToYou: "not-friends"
        }
      })
    })
  })

  it("should not remove the relation status of blocked user when you are blocked by them", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    const token2 = await createUserAndUpdateAuth(global.defaultUser2)
    await callBlockUser(token1, global.defaultUser2.id)
    await callBlockUser(token2, global.defaultUser.id)

    const resp = await callGetUser(token2, global.defaultUser.id)

    expect(resp).toMatchObject({
      body: expect.objectContaining({
        relations: {
          youToThem: "blocked",
          themToYou: "blocked"
        }
      })
    })
  })
})
