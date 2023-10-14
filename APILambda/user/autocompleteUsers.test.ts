import { resetDatabaseBeforeEach } from "../test/database.js"
import { callAutocompleteUsers, callPostUser } from "../test/helpers/users.js"

describe("AutocompleteUsers tests", () => {
  resetDatabaseBeforeEach()

  test("autocomplete endpoint basic request", async () => {
    const user1 = await global.registerUser({ name: "Bitchell Dickle" })
    const user1Profile = (await callPostUser(user1.auth)).body
    const user2 = await global.registerUser({ name: "Big Chungus" })
    const user2Profile = (await callPostUser(user2.auth)).body

    const resp = await callAutocompleteUsers("bi", 50)
    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject({
      users: [
        {
          id: user2Profile.id,
          name: "Big Chungus",
          handle: user2Profile.handle
        },
        {
          id: user1Profile.id,
          name: "Bitchell Dickle",
          handle: user1Profile.handle
        }
      ]
    })
  })

  it("should only query up to the limit", async () => {
    const user1 = await global.registerUser({ name: "Bitchell Dickle" })
    const user2 = await global.registerUser({ name: "Big Chungus" })
    await callPostUser(user1.auth)
    await callPostUser(user2.auth)

    const resp = await callAutocompleteUsers("bi", 1)
    expect(resp.status).toEqual(200)
    expect(resp.body.users).toHaveLength(1)
  })
})
