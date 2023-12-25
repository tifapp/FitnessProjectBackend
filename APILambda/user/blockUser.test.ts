import { randomUUID } from "crypto"
import {
  callBlockUser,
  callGetUser,
  callPostFriendRequest
} from "../test/apiCallers/users.js"
import { withEmptyResponseBody } from "../test/assertions.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Block User tests", () => {
  // TEST THAT USER IS KICKED OUT OF EVENT AFTER BEING BLOCKED

  it("should 404 when trying to block a non-existent user", async () => {
    const userId = randomUUID()
    const { token: fromUserToken } = await createUserFlow()
    const resp = await callBlockUser(fromUserToken, userId)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "user-not-found", userId }
    })
  })

  it("should 204 when successful block", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const { userId: toUserId } = await createUserFlow()
    const resp = await callBlockUser(fromUserToken, toUserId)

    expect(withEmptyResponseBody(resp)).toMatchObject({
      status: 204,
      body: ""
    })
  })

  it("should remove relation status of blocked user to you when blocking", async () => {
    const { token: fromUserToken, userId: fromUserId } = await createUserFlow()
    const { token: toUserToken, userId: toUserId } = await createUserFlow()
    await callPostFriendRequest(toUserToken, fromUserId)
    await callBlockUser(fromUserToken, toUserId)

    const resp = await callGetUser(fromUserToken, toUserId)

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
    const { token: fromUserToken, userId: fromUserId } = await createUserFlow()
    const { token: toUserToken, userId: toUserId } = await createUserFlow()
    await callBlockUser(fromUserToken, toUserId)
    await callBlockUser(toUserToken, fromUserId)

    const resp = await callGetUser(toUserToken, fromUserId)

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
