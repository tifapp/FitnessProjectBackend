import {
  callBlockUser,
  callPostFriendRequest
} from "../test/apiCallers/users"
import { createUserFlow } from "../test/userFlows/users"

describe("FriendRequest tests", () => {
  it("should have a pending status when no prior relation between users", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    const resp = await callPostFriendRequest(fromUser.token, toUser.userId)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friend-request-pending" }
    })
  })

  it("should return the same status when already existing pending friend request", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await callPostFriendRequest(fromUser.token, toUser.userId)
    const resp = await callPostFriendRequest(fromUser.token, toUser.userId)
    expect(resp).toMatchObject({
      status: 200,
      body: { status: "friend-request-pending" }
    })
  })

  it("should return the same status when already friends", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await callPostFriendRequest(fromUser.token, toUser.userId)
    await callPostFriendRequest(toUser.token, fromUser.userId)

    const resp = await callPostFriendRequest(fromUser.token, toUser.userId)
    expect(resp).toMatchObject({
      status: 200,
      body: { status: "friends" }
    })
  })

  it("should set users as friends when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await callPostFriendRequest(fromUser.token, toUser.userId)

    const resp = await callPostFriendRequest(toUser.token, fromUser.userId)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friends" }
    })
  })

  it("should not allow a user to send friend requests to users who have blocked them", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await callBlockUser(fromUser.token, toUser.userId)

    const resp = await callPostFriendRequest(toUser.token, fromUser.userId)
    expect(resp).toMatchObject({
      status: 403,
      body: { status: "blocked" }
    })
  })

  it("should unblock the user when trying to send friend request to blocked user", async () => {
    const fromUser = await createUserFlow()
    const toUser = await createUserFlow()
    await callBlockUser(fromUser.token, toUser.userId)

    const resp = await callPostFriendRequest(fromUser.token, toUser.userId)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friend-request-pending" }
    })
  })
})
