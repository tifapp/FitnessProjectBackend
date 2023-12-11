import { randomUUID } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database.js"
import {
  callRegisterPushToken,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"

describe("RegisterPushToken tests", () => {
  resetDatabaseBeforeEach()

  it("should 201 when registering a new push token", async () => {
    const user = await global.registerUser({ name: "Bitchell Dickle" })
    const userToken = await createUserAndUpdateAuth(user)
    const resp = await callRegisterPushToken(
      userToken,
      registerPushTokenBody(randomUUID())
    )
    expect(resp).toMatchObject({
      status: 201,
      body: {}
    })
  })

  it("should 400 when registering an existing push token on the same platform", async () => {
    const user = await global.registerUser({ name: "Bitchell Dickle" })
    const userToken = await createUserAndUpdateAuth(user)
    const pushToken = randomUUID()
    await callRegisterPushToken(userToken, registerPushTokenBody(pushToken))
    const resp = await callRegisterPushToken(
      userToken,
      registerPushTokenBody(pushToken)
    )
    expect(resp).toMatchObject({
      status: 400,
      body: { error: "token-already-registered" }
    })
  })

  it("should be able to insert multiple tokens with 201s", async () => {
    const user = await global.registerUser({ name: "Bitchell Dickle" })
    const userToken = await createUserAndUpdateAuth(user)
    await callRegisterPushToken(userToken, registerPushTokenBody(randomUUID()))
    const resp = await callRegisterPushToken(
      userToken,
      registerPushTokenBody(randomUUID())
    )
    expect(resp).toMatchObject({
      status: 201,
      body: {}
    })
  })

  const registerPushTokenBody = (pushToken: string) => ({
    pushToken,
    platformName: "android" as const
  })
})
