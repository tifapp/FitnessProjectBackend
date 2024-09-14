import { randomUUID } from "crypto"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { createUserFlow, TestUser } from "../test/userFlows/createUserFlow"

describe("Block User tests", () => {
  // TEST THAT USER IS KICKED OUT OF EVENT AFTER BEING BLOCKED

  it("should 404 when trying to block a non-existent user", async () => {
    const fromUser = await createUserFlow()
    const unknownUserId = randomUUID()
    const resp = await testAPI.blockUser(userToUserRequest(fromUser, { id: unknownUserId } as TestUser))

    expect(resp).toMatchObject({
      status: 404,
      data: { error: "user-not-found", userId: unknownUserId }
    })
  })

  it("should 204 when successful block", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    const resp = await testAPI.blockUser(userToUserRequest(fromUser, toUser))

    expect(resp).toMatchObject({
      status: 204,
      data: {}
    })
  })

  it("should remove relation status of blocked user to you when blocking", async () => {
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

    expect(await testAPI.getUser(userToUserRequest(toUser, fromUser))).toMatchObject({
      data: expect.objectContaining({
        relations: {
          fromYouToThem: "not-friends",
          fromThemToYou: "blocked"
        }
      })
    })
  })

  it("should not remove the relation status of blocked user when you are blocked by them", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await testAPI.blockUser(userToUserRequest(fromUser, toUser))
    await testAPI.blockUser(userToUserRequest(toUser, fromUser))

    expect(await testAPI.getUser(userToUserRequest(fromUser, toUser))).toMatchObject({
      data: expect.objectContaining({
        relations: {
          fromYouToThem: "blocked",
          fromThemToYou: "blocked"
        }
      })
    })

    expect(await testAPI.getUser(userToUserRequest(toUser, fromUser))).toMatchObject({
      data: expect.objectContaining({
        relations: {
          fromYouToThem: "blocked",
          fromThemToYou: "blocked"
        }
      })
    })
  })
})
