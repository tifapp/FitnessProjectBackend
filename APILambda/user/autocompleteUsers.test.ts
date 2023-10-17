import { resetDatabaseBeforeEach } from "../test/database.js"
import { callAutocompleteUsers, callPostUser } from "../test/helpers/users.js"

describe("AutocompleteUsers tests", () => {
  resetDatabaseBeforeEach()

  test("autocomplete endpoint basic request", async () => {
    // create test user 1, then test
    const user1Data = (await callPostUser(global.testUsers[0].authorization)).body
    await callPostUser(global.testUsers[1].authorization)
    const user2Data = (await callPostUser(global.testUsers[2].authorization)).body

    const resp = await callAutocompleteUsers("bi", 50)
    expect(resp.status).toEqual(200)
    expect(resp.body).toMatchObject({
      users: [
        {
          id: user1Data.id,
          name: "Bitchell Dickle",
          handle: user1Data.handle
        },
        {
          id: user2Data.id,
          name: "Big Chungus",
          handle: user2Data.handle
        }
      ]
    })
  })

  it("should only query up to the limit", async () => {
    await callPostUser(global.testUsers[0].authorization)
    await callPostUser(global.testUsers[1].authorization)

    const resp = await callAutocompleteUsers("go", 1)
    expect(resp.status).toEqual(200)
    expect(resp.body.users).toHaveLength(1)
  })
})
