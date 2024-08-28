import { callGetSelf } from "../test/apiCallers/userEndpoints"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("GetSelf tests", () => {
  it("should return 500 when we can't retrieve a user's profile", async () => {
    const resp = await callGetSelf(global.unregisteredUser.auth)
    expect(resp).toMatchObject({
      status: 500,
      body: { error: "user-not-found" }
    })
  })

  // it("should return 401 when the user has no profile", async () => {
  //   const resp = await callGetSelf(global.defaultUser.auth)
  //   expect(resp).toMatchObject({
  //     status: 401,
  //     body: { error: "user-does-not-exist" }
  //   })
  // })

  it("should be able to fetch your private account info", async () => {
    const { token, userId } = await createUserFlow()
    const resp = await callGetSelf(token)

    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        id: userId,
        bio: null,
        profileImageURL: null
      })
    })
    expect(Date.parse(resp.body.createdDateTime)).not.toBeNaN()
    expect(Date.parse(resp.body.updatedDateTime)).not.toBeNaN()
  })
})
