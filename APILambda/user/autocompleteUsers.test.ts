import { callAutocompleteUsers, callUpdateUserHandle } from "../test/apiCallers/userEndpoints"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("AutocompleteUsers tests", () => {
  test("autocomplete endpoint basic request", async () => {
    const { token: user1Token, name: user1Name, userId: user1Id } = await createUserFlow()
    await callUpdateUserHandle(user1Token, "BitchellDickle")

    const { name: user2Name, userId: user2Id, token: user2Token } = await createUserFlow()
    await callUpdateUserHandle(user2Token, "BigChungus")

    const resp = await callAutocompleteUsers(user1Token, "bi", 50)

    expect(resp).toMatchObject({
      status: 200,
      body: {
        users: [
          {
            id: user2Id,
            name: user2Name,
            handle: "BigChungus"
          },
          {
            id: user1Id,
            name: user1Name,
            handle: "BitchellDickle"
          }
        ]
      }
    })
  })

  it("should only query up to the limit", async () => {
    const { token: user1Token } = await createUserFlow()
    await callUpdateUserHandle(user1Token, "BitchellDickle")

    const { token: user2Token } = await createUserFlow()
    await callUpdateUserHandle(user2Token, "BigChungus")

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
