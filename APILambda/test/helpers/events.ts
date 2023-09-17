import request from "supertest"
import { CreateEventInput } from "../../events"
import { testApp } from "../testVariables"

export const callCreateEvent = async (
  selfId: string,
  req: CreateEventInput
) => {
  return await request(testApp)
    .post("/event")
    .set("Authorization", selfId)
    .send(req)
}

export const callGetEvent = async (
  selfId: string,
  eventId: Number
) => {
  return await request(testApp)
    .get(`/event/${eventId}`)
    .set("Authorization", selfId)
    .send()
}

export const callGetEventChatToken = async (
  selfId: string,
  eventId: Number
) => {
  return await request(testApp)
    .get(`/event/chat/${eventId}`)
    .set("Authorization", selfId)
    .send()
}
