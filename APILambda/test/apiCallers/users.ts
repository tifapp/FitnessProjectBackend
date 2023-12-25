import request from "supertest"
import { PushTokenPlatformName } from "../../user/registerPushToken.js"
import { UserSettings } from "../../user/settings/models.js"
import { testApp } from "../testApp.js"

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

export const callUpdateUserName = async (
  userId: string,
  name: string
) => {
  return await request(testApp)
    .patch("/user/self")
    .set("Authorization", userId)
    .send({ name })
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

export const callUnblockUser = async (
  userToken: string,
  unblockedUserId: string
) => {
  return await request(testApp)
    .delete(`/user/block/${unblockedUserId}`)
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
