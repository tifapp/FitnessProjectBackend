import request from "supertest"
import { UserSettings } from "../../user"
import { testApp } from "../testVariables"

export const callPatchSettings = async (selfId: string, settings: Partial<UserSettings>) => {
  return await request(testApp)
    .patch("/user/self/settings")
    .set("Authorization", selfId)
    .send(settings)
}

export const callGetSettings = async (selfId: string) => {
  return await request(testApp)
    .get("/user/self/settings")
    .set("Authorization", selfId)
    .send()
}

export const callGetSelf = async (selfId: string) => {
  return await request(testApp).get("/user/self").set("Authorization", selfId).send()
}

export const callPostFriendRequest = async (selfId: string, toUser: string) => {
  return await request(testApp)
    .post(`/user/friend/${toUser}`)
    .set("Authorization", selfId)
    .send()
}

export const callPostUser = async (selfId: string) => {
  return await request(testApp).post("/user").set("Authorization", `Bearer ${selfId}`).send()
}

export const callGetUser = async (youId: string, selfId: string) => {
  return await request(testApp)
    .get(`/user/${selfId}`)
    .set("Authorization", youId)
    .send()
}

export const callDeleteSelf = async (selfId: string) => {
  return await request(testApp)
    .delete("/user/self")
    .set("Authorization", selfId)
    .send()
}
