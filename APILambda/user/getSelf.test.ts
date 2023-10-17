import { userNotFoundBody } from "../shared/Responses.js"
import { callGetSelf, callPostUser } from "../test/helpers/users.js"
import { testAuthorizationHeader, mockClaims } from "../test/testVariables.js"

describe("GetSelf tests", () => {
  it("404s when you have no account", async () => {
    const resp = await callGetSelf(testAuthorizationHeader)
    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(mockClaims.sub))
  })

  it("should be able to fetch your private account info", async () => {
    await callPostUser(testAuthorizationHeader)
    const resp = await callGetSelf(testAuthorizationHeader)

    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject(
      expect.objectContaining({
        id: mockClaims.sub,
        bio: null,
        updatedAt: null,
        profileImageURL: null
      })
    )
    expect(Date.parse(resp.body.creationDate)).not.toBeNaN()
  })
})
