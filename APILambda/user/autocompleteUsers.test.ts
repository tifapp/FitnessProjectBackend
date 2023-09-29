import { randomUUID } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database"
import { callAutocompleteUsers, callPostUser } from "../test/helpers/users"
import { generateMockToken, mockClaims } from "../test/testVariables"

describe("AutocompleteUsers tests", () => {
  resetDatabaseBeforeEach()

  test("basic request", async () => {
    const user1Data = (await callPostUser(generateMockToken({ ...mockClaims, sub: randomUUID(), name: "Bitchell Dickle" }))).body
    await callPostUser(generateMockToken({ ...mockClaims, name: "Gojo" }))
    const user2Data = (await callPostUser(generateMockToken({ ...mockClaims, sub: randomUUID(), name: "Big Chungus" }))).body

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
    await callPostUser(generateMockToken({ ...mockClaims, sub: randomUUID(), name: "Gojo" }))
    await callPostUser(generateMockToken({ ...mockClaims, sub: randomUUID(), name: "Gojo" }))

    const resp = await callAutocompleteUsers("go", 1)
    expect(resp.status).toEqual(200)
    expect(resp.body.users).toHaveLength(1)
  })
})
