import { resetDatabaseBeforeEach } from "../test/database.js"
import { callAutocompleteUsers, callGetSelf, createUserAndUpdateAuth } from "../test/helpers/users.js"

describe("AutocompleteUsers tests", () => {
  resetDatabaseBeforeEach()

  test("autocomplete endpoint basic request", async () => {
    const user1 = await global.registerUser({ name: "Bitchell Dickle" })
    const user1Token = await createUserAndUpdateAuth(user1)
    const user1Profile = (await callGetSelf(user1Token)).body

    const user2 = await global.registerUser({ name: "Big Chungus" })
    const user2Token = await createUserAndUpdateAuth(user2)
    const user2Profile = (await callGetSelf(user2Token)).body

    const resp = await callAutocompleteUsers(user1Token, "bi", 50)

    expect(resp).toMatchObject({
      status: 200,
      body: {
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
      }
    })
  })

  it("should only query up to the limit", async () => {
    const user1 = await global.registerUser({ name: "Bitchell Dickle" })
    const user1Token = await createUserAndUpdateAuth(user1)

    const user2 = await global.registerUser({ name: "Big Chungus" })
    await createUserAndUpdateAuth(user2)

    const resp = await callAutocompleteUsers(user1Token, "bi", 1)

    expect(resp).toMatchObject({
      status: 200,
      body: {
        users: expect.arrayContaining([expect.anything()])
      }
    })
    expect(resp.body.users).toHaveLength(1)
  })
})
