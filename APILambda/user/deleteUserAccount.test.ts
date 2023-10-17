import { userNotFoundBody } from "../shared/Responses.js"
import { callDeleteSelf, callPostUser } from "../test/helpers/users.js"

describe("DeleteSelf tests", () => {
  it("should 404 on non existing user", async () => {
    const resp = await callDeleteSelf(global.defaultUser.auth)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(global.defaultUser.id))
  })

  it("should give a 204 when you sucessfully delete the user", async () => {
    await callPostUser(global.defaultUser.auth)

    const resp = await callDeleteSelf(global.defaultUser.auth)
    expect(resp.status).toEqual(204)
  })
})
