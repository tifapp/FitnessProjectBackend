import { userNotFoundBody } from "../shared/Responses.js"
import { callDeleteSelf, callPostUser } from "../test/helpers/users.js"
import { testAuthorizationHeader, mockClaims } from "../test/testVariables.js"

describe("DeleteSelf tests", () => {
  it("should 404 on non existing user", async () => {
    const resp = await callDeleteSelf(testAuthorizationHeader)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(mockClaims.sub))
  })

  it("should give a 204 when you sucessfully delete the user", async () => {
    await callPostUser(testAuthorizationHeader)

    const resp = await callDeleteSelf(testAuthorizationHeader)
    expect(resp.status).toEqual(204)
  })
})
