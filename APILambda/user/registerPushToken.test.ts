import { randomUUID } from "crypto"
import {
  callRegisterPushToken
} from "../test/apiCallers/users.js"
import { withEmptyResponseBody } from "../test/assertions.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("RegisterPushToken tests", () => {
  it("should 201 when registering a new push token", async () => {
    const { token: userToken } = await createUserFlow()
    const resp = await callRegisterPushToken(
      userToken,
      registerPushTokenBody(randomUUID())
    )
    expect(withEmptyResponseBody(resp)).toMatchObject({
      status: 201,
      body: ""
    })
  })

  it("should 400 when registering an existing push token on the same platform", async () => {
    const { token } = await createUserFlow()
    const pushToken = randomUUID()
    await callRegisterPushToken(token, registerPushTokenBody(pushToken))
    const resp = await callRegisterPushToken(
      token,
      registerPushTokenBody(pushToken)
    )
    expect(resp).toMatchObject({
      status: 400,
      body: { error: "token-already-registered" }
    })
  })

  it("should be able to insert multiple tokens with 201s", async () => {
    const { token } = await createUserFlow()
    await callRegisterPushToken(token, registerPushTokenBody(randomUUID()))
    const resp = await callRegisterPushToken(
      token,
      registerPushTokenBody(randomUUID())
    )
    expect(withEmptyResponseBody(resp)).toMatchObject({
      status: 201,
      body: ""
    })
  })

  const registerPushTokenBody = (pushToken: string) => ({
    pushToken,
    platformName: "android" as const
  })
})
