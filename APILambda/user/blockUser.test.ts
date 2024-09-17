import { randomUUID } from "crypto"
import { blockedUserResponse, userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { createUserFlow, TestUser } from "../test/userFlows/createUserFlow"

describe("Block User tests", () => {
  // TODO: TEST THAT USER IS KICKED OUT OF EVENT AFTER BEING BLOCKED

  it("should 404 when trying to block a non-existent user", async () => {
    const fromUser = await createUserFlow()
    const unknownUserId = randomUUID()
    const resp = await testAPI.blockUser(userToUserRequest(fromUser, { id: unknownUserId } as TestUser))

    expect(resp).toEqual({
      status: 404,
      data: { error: "user-not-found", userId: unknownUserId }
    })
  })

  it("should 204 when successful block", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    const resp = await testAPI.blockUser(userToUserRequest(fromUser, toUser))

    expect(resp).toEqual({
      status: 204,
      data: {}
    })
  })

  it("should reset relation status from blocked user to you when you block them", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await testAPI.sendFriendRequest({ auth: toUser.auth, params: { userId: fromUser.id } })
    await testAPI.blockUser({ auth: fromUser.auth, params: { userId: toUser.id } })

    expect(await testAPI.getUser(userToUserRequest(fromUser, toUser))).toMatchObject({
      data: expect.objectContaining({
        relations: {
          fromYouToThem: "blocked",
          fromThemToYou: "not-friends"
        }
      })
    })

    expect(await testAPI.getUser(userToUserRequest(toUser, fromUser))).toMatchObject(blockedUserResponse(fromUser.id))
  })

  it("should not remove the relation status of blocked user when you are blocked by them", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await testAPI.blockUser(userToUserRequest(fromUser, toUser))
    await testAPI.blockUser(userToUserRequest(toUser, fromUser))

    expect(await testAPI.getUser(userToUserRequest(fromUser, toUser))).toMatchObject(blockedUserResponse(toUser.id))
    expect(await testAPI.getUser(userToUserRequest(toUser, fromUser))).toMatchObject(blockedUserResponse(fromUser.id))
  })
})
