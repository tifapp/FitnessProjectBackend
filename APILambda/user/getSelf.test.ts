import { testAPI } from "../test/testApp"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("GetSelf tests", () => {
  it("should return 500 when we can't retrieve a user's profile", async () => {
    await expect(
      testAPI.getSelf({ auth: global.unregisteredUser.auth })
    ).resolves.toMatchObject({ status: 500, data: { error: "self-not-found" } })
  })

  // it("should return 401 when the user has no profile", async () => {
  //   const resp = await testAPI.getSelf (global.defaultUser.auth)
  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should be able to fetch your private account info", async () => {
    const newUser = await createUserFlow()
    const resp = await testAPI.getSelf({ auth: newUser.auth })

    expect(resp).toMatchObject({
      status: 200,
      data: expect.objectContaining({
        id: newUser.id
      })
    })
    expect(resp.data.createdDateTime).not.toBeNaN()
    expect(resp.data.updatedDateTime).not.toBeNaN()
  })
})
