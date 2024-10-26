import { testAPI } from "../test/testApp"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("AutocompleteUsers tests", () => {
  test("autocomplete endpoint basic request", async () => {
    const newUser = await createUserFlow()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await testAPI.updateCurrentUserProfile({ auth: newUser.auth, body: { handle: "BitchellDickle" as any } })

    const searchedUser = await createUserFlow()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await testAPI.updateCurrentUserProfile({ auth: searchedUser.auth, body: { handle: "BigChungus" as any } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = await testAPI.autocompleteUsers({ auth: newUser.auth, query: { handle: "bi" as any, limit: 50 } })

    expect(resp).toMatchObject({
      status: 200,
      data: {
        users: [
          {
            id: searchedUser.id,
            name: searchedUser.name,
            handle: "BigChungus"
          },
          {
            id: newUser.id,
            name: newUser.name,
            handle: "BitchellDickle"
          }
        ]
      }
    })
  })

  it("should only query up to the limit", async () => {
    const newUser = await createUserFlow()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await testAPI.updateCurrentUserProfile({ auth: newUser.auth, body: { handle: "BitchellDickle" as any } })

    const searchedUser = await createUserFlow()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await testAPI.updateCurrentUserProfile({ auth: searchedUser.auth, body: { handle: "BigChungus" as any } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = await testAPI.autocompleteUsers({ auth: newUser.auth, query: { handle: "bi" as any, limit: 1 } })

    expect(resp).toMatchObject({
      status: 200,
      data: {
        users: expect.arrayContaining([expect.anything()])
      }
    })
    expect(resp.data.users).toHaveLength(1)
  })
})
