import request from "supertest"
import { UserSettings } from "../../user/index.js"
import { testApp } from "../testVariables.js"

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

export const callPostUser = async (bearerToken: string) => {
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
