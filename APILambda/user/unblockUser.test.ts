import { randomUUID } from "crypto"
import {
  callBlockUser,
  callGetUser,
  callPostFriendRequest,
  callUnblockUser
} from "../test/apiCallers/users.js"
import { withEmptyResponseBody } from "../test/assertions.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("UnblockUser tests", () => {
  it("should 403 when the unblocked user exists, but has no prior relation to user", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const { userId: toUserId } = await createUserFlow()
    const resp = await callUnblockUser(fromUserToken, toUserId)

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "user-not-blocked", userId: toUserId }
    })
  })

  it("should 403 when the unblocked user exists, but user is not blocking them", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const { userId: toUserId } = await createUserFlow()
    await callPostFriendRequest(fromUserToken, toUserId)
    const resp = await callUnblockUser(fromUserToken, toUserId)

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "user-not-blocked", userId: toUserId }
    })
  })

  it("should 404 when the unblocked does not exist", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const unregistedUserId = randomUUID()
    const resp = await callUnblockUser(fromUserToken, unregistedUserId)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "user-not-found", userId: unregistedUserId }
    })
  })

  it("should 204 when the unblocked user exists, and is blocked by user", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const { userId: toUserId } = await createUserFlow()
    await callBlockUser(fromUserToken, toUserId)
    const resp = await callUnblockUser(fromUserToken, toUserId)
    expect(withEmptyResponseBody(resp)).toMatchObject({ status: 204, body: "" })
  })

  it("should remove blocked status when unblocking user", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const { userId: toUserId } = await createUserFlow()
    await callBlockUser(fromUserToken, toUserId)
    await callUnblockUser(fromUserToken, toUserId)

    const resp = await callGetUser(fromUserToken, toUserId)
    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        relations: { youToThem: null, themToYou: null }
      })
    })
  })
})
