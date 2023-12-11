import { resetDatabaseBeforeEach } from "../test/database.js"
import {
  callBlockUser,
  callPostFriendRequest,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"

describe("FriendRequest tests", () => {
  resetDatabaseBeforeEach()

  it("should have a pending status when no prior relation between users", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    const resp = await callPostFriendRequest(token1, global.defaultUser2.id)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friend-request-pending" }
    })
  })

  it("should return the same status when already existing pending friend request", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    await callPostFriendRequest(token1, global.defaultUser2.id)
    const resp = await callPostFriendRequest(token1, global.defaultUser2.id)
    expect(resp).toMatchObject({
      status: 200,
      body: { status: "friend-request-pending" }
    })
  })

  it("should return the same status when already friends", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    const token2 = await createUserAndUpdateAuth(global.defaultUser2)
    await callPostFriendRequest(token1, global.defaultUser2.id)
    await callPostFriendRequest(token2, global.defaultUser.id)

    const resp = await callPostFriendRequest(token1, global.defaultUser2.id)
    expect(resp).toMatchObject({
      status: 200,
      body: { status: "friends" }
    })
  })

  it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    const token2 = await createUserAndUpdateAuth(global.defaultUser2)
    await callPostFriendRequest(token1, global.defaultUser2.id)

    const resp = await callPostFriendRequest(token2, global.defaultUser.id)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friends" }
    })
  })

  it("should not allow a user to send friend requests to users who have blocked them", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    const token2 = await createUserAndUpdateAuth(global.defaultUser2)
    await callBlockUser(token1, global.defaultUser2.id)

    const resp = await callPostFriendRequest(token2, global.defaultUser.id)
    expect(resp).toMatchObject({
      status: 403,
      body: { status: "blocked" }
    })
  })

  it("should unblock the user when trying to send friend request to blocked user", async () => {
    const token1 = await createUserAndUpdateAuth(global.defaultUser)
    await createUserAndUpdateAuth(global.defaultUser2)
    await callBlockUser(token1, global.defaultUser2.id)

    const resp = await callPostFriendRequest(token1, global.defaultUser2.id)
    expect(resp).toMatchObject({
      status: 201,
      body: { status: "friend-request-pending" }
    })
  })
})
