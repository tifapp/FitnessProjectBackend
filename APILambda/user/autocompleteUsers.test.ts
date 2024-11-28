import { testAPI } from "../test/testApp"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("AutocompleteUsers tests", () => {
  test("autocomplete endpoint basic request", async () => {
    const newUser = await createUserFlow()
    await testAPI.updateCurrentUserProfile({
      auth: newUser.auth,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: { handle: "BitchellDickle" as any }
    })

    const searchedUser = await createUserFlow()
    await testAPI.updateCurrentUserProfile({
      auth: searchedUser.auth,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: { handle: "BigChungus" as any }
    })

    const resp = await testAPI.autocompleteUsers({
      auth: newUser.auth,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query: { handle: "bi" as any, limit: 50 }
    })

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
    await testAPI.updateCurrentUserProfile({
      auth: newUser.auth,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: { handle: "BitchellDickle" as any }
    })

    const searchedUser = await createUserFlow()
    await testAPI.updateCurrentUserProfile({
      auth: searchedUser.auth,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: { handle: "BigChungus" as any }
    })

    const resp = await testAPI.autocompleteUsers({
      auth: newUser.auth,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query: { handle: "bi" as any, limit: 1 }
    })

    expect(resp).toMatchObject({
      status: 200,
      data: {
        users: expect.arrayContaining([expect.anything()])
      }
    })
    expect(resp.data.users).toHaveLength(1)
  })
})
