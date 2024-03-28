import request from "supertest"
import { testApp } from "../testApp.js"

export const callCreateEvent = async (
  bearerToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any
) => {
  return await request(testApp)
    .post("/event")
    .set("Authorization", bearerToken)
    .send(req)
}

export const callJoinEvent = async (
  bearerToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventId: number
) => {
  return await request(testApp)
    .post(`/event/join/${eventId}`)
    .set("Authorization", bearerToken)
    .send()
}

export const callGetEvent = async (bearerToken: string, eventId: number) => {
  return await request(testApp)
    .get(`/event/${eventId}`)
    .set("Authorization", bearerToken)
    .send()
}

export const callGetEventsByRegion = async (
  bearerToken: string,
  userLatitude: number,
  userLongitude: number,
  radius: number
) => {
  return await request(testApp)
    .post("/event/region")
    .set("Authorization", bearerToken)
    .send({ userLatitude, userLongitude, radius })
}

export const callGetEventChatToken = async (
  bearerToken: string,
  eventId: number
) => {
  return await request(testApp)
    .get(`/event/chat/${eventId}`)
    .set("Authorization", bearerToken)
    .send()
}
