import request from "supertest"
import { CreateEventInput } from "../../events/index.js"
import { testApp } from "../testUsers.js"

export const callCreateEvent = async (
  bearerToken: string,
  req: CreateEventInput
) => {
  return await request(testApp)
    .post("/event")
    .set("Authorization", bearerToken)
    .send(req)
}

export const callGetEvent = async (
  bearerToken: string,
  eventId: Number
) => {
  return await request(testApp)
    .get(`/event/${eventId}`)
    .set("Authorization", bearerToken)
    .send()
}

export const callGetEventChatToken = async (
  bearerToken: string,
  eventId: Number
) => {
  return await request(testApp)
    .get(`/event/chat/${eventId}`)
    .set("Authorization", bearerToken)
    .send()
}
