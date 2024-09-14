import { randomUUID } from "crypto"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { createUserFlow, TestUser } from "../test/userFlows/createUserFlow"

describe("UnblockUser tests", () => {
  it("should 403 when the unblocked user exists, but has no prior relation to user", async () => {
    const newUser = await createUserFlow()
    const blockedUser = await createUserFlow()
    const resp = await testAPI.unblockUser(userToUserRequest(newUser, blockedUser))

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "user-not-blocked", userId: blockedUser.id }
    })
  })

  it("should 403 when the unblocked user exists, but user is not blocking them", async () => {
    const newUser = await createUserFlow()
    const blockedUser = await createUserFlow()
    await testAPI.sendFriendRequest(userToUserRequest(newUser, blockedUser))
    const resp = await testAPI.unblockUser(userToUserRequest(newUser, blockedUser))

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "user-not-blocked", userId: blockedUser.id }
    })
  })

  // need generic "user exists middleware or fn"
  it("should 404 when the unblocked does not exist", async () => {
    const newUser = await createUserFlow()
    const unregistedUserId = randomUUID()
    const resp = await testAPI.unblockUser(userToUserRequest(newUser, { id: unregistedUserId } as TestUser))

    expect(resp).toMatchObject({
      status: 404,
      data: { error: "user-not-found", userId: unregistedUserId }
    })
  })

  it("should 204 when the unblocked user exists, and is blocked by user", async () => {
    const newUser = await createUserFlow()
    const blockedUser = await createUserFlow()
    await testAPI.blockUser(userToUserRequest(newUser, blockedUser))
    const resp = await testAPI.unblockUser(userToUserRequest(newUser, blockedUser))
    expect(resp).toMatchObject({ status: 204, data: {} })
  })

  it("should remove blocked status when unblocking user", async () => {
    const newUser = await createUserFlow()
    const blockedUser = await createUserFlow()
    await testAPI.blockUser(userToUserRequest(newUser, blockedUser))
    await testAPI.unblockUser(userToUserRequest(newUser, blockedUser))

    const resp = await testAPI.getUser(userToUserRequest(newUser, blockedUser))
    expect(resp).toMatchObject({
      status: 200,
      data: expect.objectContaining({
        relations: { fromYouToThem: "not-friends", fromThemToYou: "not-friends" }
      })
    })

    const resp2 = await testAPI.unblockUser(userToUserRequest(newUser, blockedUser))
    expect(resp2).toMatchObject({
      status: 403,
      data: { error: "user-not-blocked", userId: blockedUser.id }
    })
  })
})
