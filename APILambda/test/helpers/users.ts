import request from "supertest"
import { UserSettings } from "../../user/index.js"
import { testApp } from "../testApp.js"

export const callPatchSettings = async (bearerToken: string, settings: Partial<UserSettings>) => {
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
  return await request(testApp).get("/user/self").set("Authorization", bearerToken).send()
}

export const callPostFriendRequest = async (bearerToken: string, toUser: string) => {
  return await request(testApp)
    .post(`/user/friend/${toUser}`)
    .set("Authorization", bearerToken)
    .send()
}

export const callPostUser = async (bearerToken?: string) => {
  if (!bearerToken) {
    return await request(testApp).post("/user").send()
  }
  return await request(testApp).post("/user").set("Authorization", bearerToken).send()
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

export const callAutocompleteUsers = async (handle: string, limit: number) => {
  return await request(testApp)
    .get("/user/autocomplete")
    .query({ handle, limit })
    .set("Authorization", global.defaultUser.auth) // todo: remove auth
    .send()
}

export const callUpdateUserHandle = async (userId: string, userHandle: string) => {
  return await request(testApp)
    .patch("/user/self")
    .set("Authorization", userId)
    .send({ handle: userHandle })
}
