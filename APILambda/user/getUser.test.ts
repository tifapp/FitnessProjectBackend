import { UserID } from "TiFShared/domain-models/User"
import { testAPI } from "../test/testApp"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("GetUser tests", () => {
  // it("should 401 on non existing user", async () => {
  //   const userId = randomUUID()
  //   const resp = await testAPI.getUser(global.defaultUser.auth, userId)

  //   expect(resp).toMatchObject({
  //     status: 401,
  //     data: { error: "user-does-not-exist" }
  //   })
  // })

  it("should retrieve self", async () => {
    const newUser = await createUserFlow()

    await expect(
      testAPI.getUser({ auth: newUser.auth, params: { userId: newUser.id as UserID } })
    ).resolves.toMatchObject({
      status: 200,
      data: expect.objectContaining({
        id: newUser.id,
        name: newUser.name,
        handle: newUser.handle,
        relations: { fromThemToYou: "current-user", fromYouToThem: "current-user" }
      })
    })
  })

  it("should retrieve a user that exists", async () => {
    const searchingUser = await createUserFlow()
    const searchedUser = await createUserFlow()

    await expect(
      testAPI.getUser({ auth: searchingUser.auth, params: { userId: searchedUser.id as UserID } })
    ).resolves.toMatchObject({
      status: 200,
      data: expect.objectContaining({
        id: searchedUser.id,
        name: searchedUser.name,
        handle: searchedUser.handle,
        relations: { fromThemToYou: "not-friends", fromYouToThem: "not-friends" }
      })
    })
  })

  it("should return error if you've been blocked", async () => {
    const newUser = await createUserFlow()
    const blockedUser = await createUserFlow()

    await testAPI.blockUser({ auth: newUser.auth, params: { userId: blockedUser.id as UserID } })
    const resp = await testAPI.getUser({ auth: blockedUser.auth, params: { userId: newUser.id as UserID } })

    expect(resp).toMatchObject({
      status: 403,
      data: {
        userId: newUser.id,
        error: "blocked"
      }
    })
  })
})
