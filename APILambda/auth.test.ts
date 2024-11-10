import { envVars } from "TiFBackendUtils/env"
import { testAPI } from "./test/testApp"
import jwt from "jsonwebtoken"

describe("Authentication tests", () => {
  describe("InvalidAuthentication tests", () => {
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
  })
})
