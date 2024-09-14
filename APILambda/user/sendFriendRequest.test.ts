import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("FriendRequest tests", () => {
  // TODO: Make middleware for params: userId
  it("should error when trying to send a friend request to yourself", async () => {
    const fromUser = await createUserFlow()
    const resp = await testAPI.sendFriendRequest(userToUserRequest(fromUser, fromUser))
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "cannot-friend-self" }
    })
  })

  it("should have a pending status when no prior relation between users", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    const resp = await testAPI.sendFriendRequest(userToUserRequest(fromUser, toUser))
    expect(resp).toMatchObject({
      status: 201,
      data: { status: "friend-request-pending" }
    })
  })

  it("should return the same status when already existing pending friend request", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await testAPI.sendFriendRequest(userToUserRequest(fromUser, toUser))
    const resp = await testAPI.sendFriendRequest(userToUserRequest(fromUser, toUser))
    expect(resp).toMatchObject({
      status: 200,
      data: { status: "friend-request-pending" }
    })
  })

  it("should set users as friends when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await testAPI.sendFriendRequest(userToUserRequest(fromUser, toUser))

    const resp = await testAPI.sendFriendRequest(userToUserRequest(toUser, fromUser))
    expect(resp).toMatchObject({
      status: 201,
      data: { status: "friends" }
    })
  })

  it("should return the same status when already friends", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await testAPI.sendFriendRequest(userToUserRequest(fromUser, toUser))
    await testAPI.sendFriendRequest(userToUserRequest(toUser, fromUser))

    const resp = await testAPI.sendFriendRequest(userToUserRequest(fromUser, toUser))
    expect(resp).toMatchObject({
      status: 200,
      data: { status: "friends" }
    })
  })

  it("should not allow a user to send friend requests to users who have blocked them", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await testAPI.blockUser(userToUserRequest(fromUser, toUser))

    const resp = await testAPI.sendFriendRequest(userToUserRequest(toUser, fromUser))
    expect(resp).toMatchObject({
      status: 403,
      data: { error: "blocked", userId: fromUser.id }
    })
  })

  it("should unblock the user when trying to send friend request to blocked user", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await testAPI.blockUser(userToUserRequest(fromUser, toUser))

    const resp = await testAPI.sendFriendRequest(userToUserRequest(fromUser, toUser))
    expect(resp).toMatchObject({
      status: 201,
      data: { status: "friend-request-pending" }
    })
  })
})
