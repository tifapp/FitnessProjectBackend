import { Application } from "express";
import request from "supertest";
import { CreateEventInput } from "../../events";

export const createTestEvent = async (app: Application, userId: string, req: CreateEventInput) => {
  return await request(app)
    .post("/event")
    .set("Authorization", userId)
    .send(req);
}