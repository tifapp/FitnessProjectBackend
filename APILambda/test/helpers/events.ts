import request from "supertest";
import { UserSettings, RegisterUserRequest } from "../../user";
import { Application } from "express";
import { CreateEventInput } from "../../events";

export const createTestEvent = async (
  app: Application,
  userId: string,
  req: CreateEventInput
) => {
  return await request(app)
    .post("/event")
    .set("Authorization", userId)
    .send(req);
};

export const getTestEvent = async (
  app: Application,
  userId: string,
  eventId: Number
) => {
  return await request(app)
    .get(`/event/${eventId}`)
    .set("Authorization", userId)
    .send();
};
