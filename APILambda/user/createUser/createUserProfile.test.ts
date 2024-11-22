import { testAPI } from "../../test/testApp"
import { jwtBody } from "TiFShared/lib/JWT"

describe("Create User Profile tests", () => {
  it("should 400 when creating a user with an empty name", async () => {
    const resp = await testAPI.createCurrentUserProfile({
      unauthenticated: true,
      body: { name: "" }
    })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-name" }
    })
  })

  it("should 201 when creating a user with a name", async () => {
    const resp = await testAPI.createCurrentUserProfile<201>({
      unauthenticated: true,
      body: { name: "Bitchell Dickle" }
    })
    expect(resp).toMatchObject({
      status: 201,
      data: {
        id: expect.any(String),
        name: "Bitchell Dickle",
        handle: expect.any(String),
        token: expect.any(String)
      }
    })
    expect(jwtBody(resp.data.token)).toMatchObject({
      id: resp.data.id,
      name: "Bitchell Dickle",
      handle: resp.data.handle
    })
  })
})
