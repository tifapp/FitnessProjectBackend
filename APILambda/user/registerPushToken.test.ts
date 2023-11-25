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
    const resp = await callRegisterPushToken(
      userToken,
      registerPushTokenBody(randomUUID())
    )
    expect(resp.status).toEqual(201)
  })

  it("should 400 when registering an existing push token on the same platform", async () => {
    const user = await global.registerUser({ name: "Bitchell Dickle" })
    const userToken = await createUserAndUpdateAuth(user.auth)
    const deviceToken = randomUUID()
    await callRegisterPushToken(userToken, registerPushTokenBody(deviceToken))
    const resp = await callRegisterPushToken(
      userToken,
      registerPushTokenBody(deviceToken)
    )
    expect(resp.status).toEqual(400)
  })

  it("should be able to insert multiple tokens with 201s", async () => {
    const user = await global.registerUser({ name: "Bitchell Dickle" })
    const userToken = await createUserAndUpdateAuth(user.auth)
    await callRegisterPushToken(userToken, registerPushTokenBody(randomUUID()))
    const resp = await callRegisterPushToken(
      userToken,
      registerPushTokenBody(randomUUID())
    )
    expect(resp.status).toEqual(201)
  })

  const registerPushTokenBody = (deviceToken: string) => ({
    deviceToken,
    platformName: "android" as const
  })
})
