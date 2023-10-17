import { userNotFoundBody } from "../shared/Responses.js"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callGetSelf, callPostUser } from "../test/helpers/users.js"

describe("GetSelf tests", () => {
  resetDatabaseBeforeEach()

  it("404s when you have no account", async () => {
    const resp = await callGetSelf(global.defaultUser.auth)
    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(global.defaultUser.id))
  })

  it("should be able to fetch your private account info", async () => {
    await callPostUser(global.defaultUser.auth)
    const resp = await callGetSelf(global.defaultUser.auth)

    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject(
      expect.objectContaining({
        id: global.defaultUser.id,
        bio: null,
        updatedAt: null,
        profileImageURL: null
      })
    )
    expect(Date.parse(resp.body.creationDate)).not.toBeNaN()
  })
})
