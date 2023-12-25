import { withEmptyResponseBody } from "../test/assertions.js"
import {
  callBlockUser,
  callGetUser,
  callPostFriendRequest,
  callUnblockUser,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"

describe("UnblockUser tests", () => {
  it("should 403 when the unblocked user exists, but has no prior relation to user", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    await createUserAndUpdateAuth(global.defaultUser2)
    const resp = await callUnblockUser(token1, global.defaultUser2.id)

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "user-not-blocked", userId: global.defaultUser2.id }
    })
  })

  it("should 403 when the unblocked user exists, but user is not blocking them", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    await createUserAndUpdateAuth(global.defaultUser2)
    await callPostFriendRequest(token1, global.defaultUser2.id)
    const resp = await callUnblockUser(token1, global.defaultUser2.id)

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "user-not-blocked", userId: global.defaultUser2.id }
    })
  })

  it("should 404 when the unblocked does not exist", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    const resp = await callUnblockUser(token1, global.defaultUser2.id)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "user-not-found", userId: global.defaultUser2.id }
    })
  })

  it("should 204 when the unblocked user exists, and is blocked by user", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    await createUserAndUpdateAuth(global.defaultUser2)
    await callBlockUser(token1, global.defaultUser2.id)
    const resp = await callUnblockUser(token1, global.defaultUser2.id)
    expect(withEmptyResponseBody(resp)).toMatchObject({ status: 204, body: "" })
  })

  it("should remove blocked status when unblocking user", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    await createUserAndUpdateAuth(global.defaultUser2)
    await callBlockUser(token1, global.defaultUser2.id)
    await callUnblockUser(token1, global.defaultUser2.id)

    const resp = await callGetUser(token1, global.defaultUser2.id)
    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        relations: { youToThem: null, themToYou: null }
      })
    })
  })
})
