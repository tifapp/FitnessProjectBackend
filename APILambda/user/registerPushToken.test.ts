import { randomUUID } from "crypto"
import { DevicePlatform } from "TiFShared/api/models/User"
import { testAPI } from "../test/testApp"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("registerForPushNotifications tests", () => {
  const TEST_SUCCESS_RESPONSE = {
    status: 201,
    data: { status: "inserted" }
  }

  it("should 201 when registering a new push token", async () => {
    const newUser = await createUserFlow()
    const resp = await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      body: generatePushToken()
    })
    expect(resp).toMatchObject(TEST_SUCCESS_RESPONSE)
  })

  it("should 400 when registering an existing push token with an invalid token", async () => {
    const newUser = await createUserFlow()
    const resp = await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      body: generatePushToken({ pushToken: "" })
    })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-request" }
    })
  })

  it("should 400 when registering an existing push token with an invalid platform", async () => {
    const newUser = await createUserFlow()
    const resp = await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      // @ts-expect-error For testing
      body: generatePushToken({ platformName: "linux" })
    })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-request" }
    })
  })

  it("should 400 when registering an existing push token on the same platform", async () => {
    const newUser = await createUserFlow()
    const pushToken = generatePushToken()
    await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      body: pushToken
    })
    const resp = await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      body: pushToken
    })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "token-already-registered" }
    })
  })

  it("should 201 when registering multiple push tokens with different platforms", async () => {
    const newUser = await createUserFlow()
    const pushTokenBody = generatePushToken()
    await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      body: pushTokenBody
    })
    const resp = await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      body: { pushToken: pushTokenBody.pushToken, platformName: "apple" as const }
    })
    expect(resp).toMatchObject(TEST_SUCCESS_RESPONSE)
  })

  it("should be able to insert multiple tokens for the same platform with 201s", async () => {
    const newUser = await createUserFlow()
    const pushTokenBody = generatePushToken()
    await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      body: pushTokenBody
    })
    const resp = await testAPI.registerForPushNotifications({
      auth: newUser.auth,
      body: generatePushToken({ pushToken: randomUUID() })
    })

    expect(resp).toMatchObject(TEST_SUCCESS_RESPONSE)
  })

  const generatePushToken = (body?: {pushToken?: string, platformName?: DevicePlatform}) => ({
    pushToken: body?.pushToken ?? randomUUID(),
    platformName: body?.platformName ?? "android" as const
  })
})
