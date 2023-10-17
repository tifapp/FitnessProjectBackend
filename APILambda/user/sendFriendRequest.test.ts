import { conn } from "TiFBackendUtils"
import { insertUser } from "./index.js"
import { callPostFriendRequest } from "../test/helpers/users.js"
import { testAuthorizationHeader, testUsers } from "../test/testVariables.js"
import { resetDatabaseBeforeEach } from "../test/database.js"

describe("FriendRequest tests", () => {
  resetDatabaseBeforeEach()
  beforeEach(async () => {
    await insertUser(conn, testUsers[0])
    await insertUser(conn, testUsers[1])
  })

  it("should have a pending status when no prior relation between uses", async () => {
    const resp = await callPostFriendRequest(testAuthorizationHeader, testUsers[1].id)
    expect(resp.status).toEqual(201)
    expect(resp.body).toMatchObject({ status: "friend-request-pending" })
  })

  it("should return the same status when already existing pending friend request", async () => {
    await callPostFriendRequest(testAuthorizationHeader, testUsers[1].id)
    const resp = await callPostFriendRequest(testAuthorizationHeader, testUsers[1].id)
    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject({ status: "friend-request-pending" })
  })

  // TODO: Allow multiple jwts
  // it("should return the same status when already friends", async () => {
  //   await sendFriendRequest(conn, testAuthorizationHeader, testUsers[1].id)
  //   await sendFriendRequest(conn, testUsers[1].id, testAuthorizationHeader)

  //   const resp = await callPostFriendRequest(testAuthorizationHeader, testUsers[1].id)
  //   expect(resp.status).toEqual(200)
  //   expect(resp.body).toMatchObject({ status: "friends" })
  // })

  // it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
  //   await sendFriendRequest(conn, testAuthorizationHeader, testUsers[1].id)

  //   const resp = await callPostFriendRequest(testUsers[1].id, testAuthorizationHeader)
  //   expect(resp.status).toEqual(201)
  //   expect(resp.body).toMatchObject({ status: "friends" })
  // })
})
