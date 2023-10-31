import { callDeleteSelf, createUserAndUpdateAuth } from "../test/helpers/users.js"

describe("DeleteSelf tests", () => {
  it("should 401 on non existing user", async () => {
    const resp = await callDeleteSelf(global.defaultUser.auth)

    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ error: "user-does-not-exist" })
  })

  it("should give a 204 when you sucessfully delete the user", async () => {
    const token = await createUserAndUpdateAuth(global.defaultUser.auth)
    const resp = await callDeleteSelf(token)
    expect(resp.status).toEqual(204)
  })
})
