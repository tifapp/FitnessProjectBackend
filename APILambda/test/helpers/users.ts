import request from "supertest"
import { UserSettings, RegisterUserRequest } from "../../user"
import { Application } from "express"

export const editSettings = async (app: Application, id: string, settings: Partial<UserSettings>) => {
  return await request(app)
    .patch("/user/self/settings")
    .set("Authorization", id)
    .send(settings)
}

export const fetchSettings = async (app: Application, id: string) => {
  return await request(app)
    .get("/user/self/settings")
    .set("Authorization", id)
    .send()
}

export const fetchSelf = async (app: Application, id: string) => {
  return await request(app).get("/user/self").set("Authorization", id).send()
}

export const friendUser = async (app: Application, user1Id: string, user2Id: string) => {
  return await request(app)
    .post(`/user/friend/${user2Id}`)
    .set("Authorization", user1Id)
    .send()
}

export const registerUser = async (app: Application, req: RegisterUserRequest) => {
  return await request(app).post("/user").set("Authorization", req.id).send({
    name: req.name,
    handle: req.handle
  })
}

export const fetchUser = async (app: Application, youId: string, userId: string) => {
  return await request(app)
    .get(`/user/${userId}`)
    .set("Authorization", youId)
    .send()
}

export const deleteSelf = async (app: Application, userId: string) => {
  return await request(app)
    .delete("/user/self")
    .set("Authorization", userId)
    .send()
}
