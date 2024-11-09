import { testAPI } from "../../test/testApp"
import { jwtBody } from "TiFShared/lib/JWT"
import jwt from "jsonwebtoken"
import { envVars } from "TiFBackendUtils/env"

describe("Create User Profile tests", () => {
  // TODO: Move to separate unit test file for auth middleware
  it("should 401 when no token is passed", async () => {
    const resp = await testAPI.getSelf({ noAuth: true })
    expect(resp).toMatchObject({
      status: 401,
      data: { error: "invalid-headers" }
    })
  })

  it("should 401 when no bearer", async () => {
    const resp = await testAPI.getSelf({
      auth: jwt.sign({ invalid: "body" }, envVars.JWT_SECRET)
    })
    expect(resp).toMatchObject({
      status: 401,
      data: { error: "invalid-headers" }
    })
  })

  it("should 401 when invalid token body", async () => {
    const resp = await testAPI.getSelf({
      auth: `Bearer ${jwt.sign({ invalid: "body" }, envVars.JWT_SECRET)}`
    })
    expect(resp).toMatchObject({
      status: 401,
      data: { error: "invalid-claims" }
    })
  })

  it("should 400 when creating a user with an empty name", async () => {
    const resp = await testAPI.createCurrentUserProfile({
      noAuth: true,
      body: { name: "" }
    })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-name" }
    })
  })

  it("should 201 when creating a user with a name", async () => {
    const resp = await testAPI.createCurrentUserProfile<201>({
      noAuth: true,
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
