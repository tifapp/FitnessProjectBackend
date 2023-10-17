import { resetDatabaseBeforeEach } from "../test/database.js"
import { callPostFriendRequest, callPostUser } from "../test/helpers/users.js"

describe("FriendRequest tests", () => {
  resetDatabaseBeforeEach()

  beforeEach(async () => {
    await callPostUser(global.defaultUser.auth)
    await callPostUser(global.defaultUser2.auth)
  })

  it("should have a pending status when no prior relation between uses", async () => {
    const resp = await callPostFriendRequest(
      global.defaultUser.auth,
      global.defaultUser2.id
    )
    expect(resp.status).toEqual(201)
    expect(resp.body).toMatchObject({ status: "friend-request-pending" })
  })

  it("should return the same status when already existing pending friend request", async () => {
    await callPostFriendRequest(
      global.defaultUser.auth,
      global.defaultUser2.id
    )
    const resp = await callPostFriendRequest(
      global.defaultUser.auth,
      global.defaultUser2.id
    )
    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject({ status: "friend-request-pending" })
  })

  it("should return the same status when already friends", async () => {
    await callPostFriendRequest(
      global.defaultUser.auth,
      global.defaultUser2.id
    )
    await callPostFriendRequest(
      global.defaultUser2.auth,
      global.defaultUser.id
    )

    const resp = await callPostFriendRequest(
      global.defaultUser.auth,
      global.defaultUser2.id
    )
    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject({ status: "friends" })
  })

  it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
    await callPostFriendRequest(
      global.defaultUser.auth,
      global.defaultUser2.id
    )

    const resp = await callPostFriendRequest(
      global.defaultUser2.auth,
      global.defaultUser.id
    )
    expect(resp.status).toEqual(201)
    expect(resp.body).toMatchObject({ status: "friends" })
  })
})
