import request from "supertest"
import { CreateEvent } from "TiFShared/api/models/Event.js"
import { EventRegion } from "TiFShared/domain-models/Event.js"
import { SetArrivalStatusInput } from "../../events/arrivals/setArrivalStatus.js"
import { SetDepartureInput } from "../../events/arrivals/setDeparture.js"
import { testApp } from "../testApp.js"

export const callCreateEvent = async (
  bearerToken: string,
  req: CreateEvent
) => {
  return await request(testApp)
    .post("/event")
    .set("Authorization", bearerToken)
    .send(req)
}

export const callJoinEvent = async (
  bearerToken: string,
  eventId: number,
  req?: {body: EventRegion}
) => {
  return await request(testApp)
    .post(`/event/join/${eventId}`)
    .set("Authorization", bearerToken)
    .send(req)
}

export const callLeaveEvent = async (
  bearerToken: string,
  eventId: number
) => {
  return await request(testApp)
    .delete(`/event/leave/${eventId}`)
    .set("Authorization", bearerToken)
    .send()
}

export const callEndEvent = async (
  bearerToken: string,
  eventId: number
) => {
  return await request(testApp)
    .post(`/event/end/${eventId}`)
    .set("Authorization", bearerToken)
    .send()
}

export const callSetArrival = async (
  bearerToken: string,
  req: SetArrivalStatusInput
) => {
  return await request(testApp)
    .post("/event/arrived")
    .set("Authorization", bearerToken)
    .send(req)
}

export const callSetDeparture = async (
  bearerToken: string,
  req: SetDepartureInput
) => {
  return await request(testApp)
    .post("/event/departed")
    .set("Authorization", bearerToken)
    .send(req)
}

export const callGetUpcomingEvents = async (
  bearerToken: string
) => {
  return await request(testApp)
    .get("/event/upcoming")
    .set("Authorization", bearerToken)
    .send()
}

export const callGetAttendees = async (
  bearerToken: string,
  eventId: number,
  limit: number,
  nextPage?: string
) => {
  return await request(testApp)
    .get(`/event/attendees/${eventId}`)
    .query({ nextPage, limit })
    .set("Authorization", bearerToken)
    .send()
}

export const callGetEvent = async (bearerToken: string, eventId: number) => {
  return await request(testApp)
    .get(`/event/details/${eventId}`)
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
