import { randomUUID } from "crypto"
import {
  callRegisterPushToken,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"
import { resetDatabaseBeforeEach } from "../test/database.js"

describe("RegisterPushToken tests", () => {
  resetDatabaseBeforeEach()

  it("should 201 when registering a new push token", async () => {
    const user = await global.registerUser({ name: "Bitchell Dickle" })
    const userToken = await createUserAndUpdateAuth(user.auth)
    const resp = await callRegisterPushToken(userToken, randomUUID())
    expect(resp.status).toEqual(201)
  })

  it("should 204 when registering an existing push token", async () => {
    const user = await global.registerUser({ name: "Bitchell Dickle" })
    const userToken = await createUserAndUpdateAuth(user.auth)
    const deviceToken = randomUUID()
    await callRegisterPushToken(userToken, deviceToken)
    const resp = await callRegisterPushToken(userToken, deviceToken)
    expect(resp.status).toEqual(204)
  })
})
