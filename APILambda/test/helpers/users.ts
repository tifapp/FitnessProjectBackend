import jwt from "jsonwebtoken"
import request from "supertest"
import { UserSettings } from "../../user/settings/models.js"
import { testApp } from "../testApp.js"
import { PushTokenPlatformName } from "../../user/registerPushToken.js"

export const callPatchSettings = async (
  bearerToken: string,
  settings: Partial<UserSettings>
) => {
  return await request(testApp)
    .patch("/user/self/settings")
    .set("Authorization", bearerToken)
    .send(settings)
}

export const callGetSettings = async (bearerToken: string) => {
  return await request(testApp)
    .get("/user/self/settings")
    .set("Authorization", bearerToken)
    .send()
}

export const callGetSelf = async (bearerToken: string) => {
  return await request(testApp)
    .get("/user/self")
    .set("Authorization", bearerToken)
    .send()
}

export const callPostFriendRequest = async (
  bearerToken: string,
  toUser: string
) => {
  return await request(testApp)
    .post(`/user/friend/${toUser}`)
    .set("Authorization", bearerToken)
    .send()
}

export const callPostUser = async (bearerToken?: string) => {
  if (!bearerToken) {
    return await request(testApp).post("/user").send()
  }
  return await request(testApp)
    .post("/user")
    .set("Authorization", bearerToken)
    .send()
}

// database is reset for each test so we need to create a new auth for each test
export const createUserAndUpdateAuth = async (
  bearerToken: string
): Promise<string> => {
  await callPostUser(bearerToken)

  const claims = JSON.parse(
    Buffer.from(bearerToken.split(".")[1], "base64").toString()
  )
  claims.profile_created = true

  const token = jwt.sign(claims, "supersecret", { algorithm: "HS256" })

  return `Bearer ${token}`
}

export const callGetUser = async (bearerToken: string, userId: string) => {
  return await request(testApp)
    .get(`/user/${userId}`)
    .set("Authorization", bearerToken)
    .send()
}

export const callDeleteSelf = async (bearerToken: string) => {
  return await request(testApp)
    .delete("/user/self")
    .set("Authorization", bearerToken)
    .send()
}

export const callAutocompleteUsers = async (
  auth: string,
  handle: string,
  limit: number
) => {
  // todo: remove required auth
  return await request(testApp)
    .get("/user/autocomplete")
    .query({ handle, limit })
    .set("Authorization", auth) // todo: remove required auth
    .send()
}

export const callUpdateUserHandle = async (
  userId: string,
  userHandle: string
) => {
  return await request(testApp)
    .patch("/user/self")
    .set("Authorization", userId)
    .send({ handle: userHandle })
}

export const callBlockUser = async (
  userToken: string,
  blockedUserId: string
) => {
  return await request(testApp)
    .patch(`/user/block/${blockedUserId}`)
    .set("Authorization", userToken)
    .send()
}

export const callRegisterPushToken = async (
  userToken: string,
  body: { pushToken: string; platformName: PushTokenPlatformName }
) => {
  return await request(testApp)
    .post("/user/notifications/push/register")
    .set("Authorization", userToken)
    .send(body)
}
