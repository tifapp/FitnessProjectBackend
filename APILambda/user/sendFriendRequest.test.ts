import {
  callBlockUser,
  callPostFriendRequest
} from "../test/apiCallers/users.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("FriendRequest tests", () => {
  it("should have a pending status when no prior relation between users", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const { userId: toUserId } = await createUserFlow()
    const resp = await callPostFriendRequest(fromUserToken, toUserId)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friend-request-pending" }
    })
  })

  it("should return the same status when already existing pending friend request", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const { userId: toUserId } = await createUserFlow()
    await callPostFriendRequest(fromUserToken, toUserId)
    const resp = await callPostFriendRequest(fromUserToken, toUserId)
    expect(resp).toMatchObject({
      status: 200,
      body: { status: "friend-request-pending" }
    })
  })

  it("should return the same status when already friends", async () => {
    const { token: fromUserToken, userId: fromUserId } = await createUserFlow()
    const { userId: toUserId, token: toUserToken } = await createUserFlow()
    await callPostFriendRequest(fromUserToken, toUserId)
    await callPostFriendRequest(toUserToken, fromUserId)

    const resp = await callPostFriendRequest(fromUserToken, toUserId)
    expect(resp).toMatchObject({
      status: 200,
      body: { status: "friends" }
    })
  })

  it("should set users as friends when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
    const { token: fromUserToken, userId: fromUserId } = await createUserFlow()
    const { userId: toUserId, token: toUserToken } = await createUserFlow()
    await callPostFriendRequest(fromUserToken, toUserId)

    const resp = await callPostFriendRequest(toUserToken, fromUserId)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friends" }
    })
  })

  it("should not allow a user to send friend requests to users who have blocked them", async () => {
    const { token: fromUserToken, userId: fromUserId } = await createUserFlow()
    const { userId: toUserId, token: toUserToken } = await createUserFlow()
    await callBlockUser(fromUserToken, toUserId)

    const resp = await callPostFriendRequest(toUserToken, fromUserId)
    expect(resp).toMatchObject({
      status: 403,
      body: { status: "blocked" }
    })
  })

  it("should unblock the user when trying to send friend request to blocked user", async () => {
    const { token: fromUserToken } = await createUserFlow()
    const { userId: toUserId } = await createUserFlow()
    await callBlockUser(fromUserToken, toUserId)

    const resp = await callPostFriendRequest(fromUserToken, toUserId)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friend-request-pending" }
    })
  })
})
