import { randomUUID } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callAutocompleteUsers, callPostUser } from "../test/helpers/users.js"
import { generateMockAuthorizationHeader, mockClaims } from "../test/testVariables.js"

describe("AutocompleteUsers tests", () => {
  resetDatabaseBeforeEach()

  test("autocomplete endpoint basic request", async () => {
    const user1Data = (await callPostUser(generateMockAuthorizationHeader({ name: "Bitchell Dickle" }))).body
    await callPostUser(generateMockAuthorizationHeader({ name: "Gojo" }))
    const user2Data = (await callPostUser(generateMockAuthorizationHeader({ name: "Big Chungus" }))).body

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
    await callPostUser(generateMockAuthorizationHeader({ ...mockClaims, sub: randomUUID(), name: "Gojo" }))
    await callPostUser(generateMockAuthorizationHeader({ ...mockClaims, sub: randomUUID(), name: "Gojo" }))

    const resp = await callAutocompleteUsers("go", 1)
    expect(resp.status).toEqual(200)
    expect(resp.body.users).toHaveLength(1)
  })
})
