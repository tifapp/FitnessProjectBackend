import {
  callGetUser
} from "../test/apiCallers/users.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("GetUser tests", () => {
  // it("should 401 on non existing user", async () => {
  //   const userId = randomUUID()
  //   const resp = await callGetUser(global.defaultUser.auth, userId)

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should retrieve a user that exists", async () => {
    const { token: searchingUserToken } = await createUserFlow()

    const { userId: searchedUserId, name: searchedUserName, handle: searchedUserHandle } = await createUserFlow()
    const resp = await callGetUser(searchingUserToken, searchedUserId)

    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        id: searchedUserId,
        name: searchedUserName,
        handle: searchedUserHandle
      })
    })
  })
})
