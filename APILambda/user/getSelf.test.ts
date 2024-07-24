import { testApi } from "../test/testApp"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("GetSelf tests", () => {
  it("should return 500 when we can't retrieve a user's profile", async () => {
    await expect(testApi.getSelf({ headers: { authorization: global.unregisteredUser.auth } }))
      .rejects.toThrow(`TiF API responded with an unexpected status code 500 and body ${JSON.stringify({ error: "self-not-found" })}`)
  })

  // it("should return 401 when the user has no profile", async () => {
  //   const resp = await testApi.getSelf (global.defaultUser.auth)
  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should be able to fetch your private account info", async () => {
    const { token, userId } = await createUserFlow()
    const resp = await testApi.getSelf({ headers: { authorization: token } })

    expect(resp).toMatchObject({
      status: 200,
      data: expect.objectContaining({
        id: userId
      })
    })
    expect(resp.data.createdDateTime).not.toBeNaN()
    expect(resp.data.updatedDateTime).not.toBeNaN()
  })
})
