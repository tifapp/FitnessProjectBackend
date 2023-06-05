import { conn } from "../dbconnection";
import { CreateEventRequest, createEvent, eventNotFoundBody } from "../events";
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach,
} from "./database";
import { mockLocationCoordinate2D } from "./mockData";
import request from "supertest";
import { createTestApp } from "./testApp";
import { randomUUID } from "crypto";

describe("Events tests", () => {
  const app = createTestApp({ conn });
  resetDatabaseBeforeEach();

  describe("CheckConstraint tests", () => {
    it("does not allow the end date to be before the start date", async () => {
      await expectFailsCheckConstraint(async () => {
        await createEvent(conn, {
          title: "no",
          description: "yay",
          startDate: new Date(1),
          endDate: new Date(0),
          color: "#72B01D",
          shouldHideAfterStartDate: true,
          isChatEnabled: true,
          ...mockLocationCoordinate2D(),
        });
      });
    });
  });

  describe("getEvent tests", () => {
    it("should 404 on nonexisting eventId", async () => {
      const youId = randomUUID();
      const eventId = Math.floor(Math.random() * 10000);
      fetchEvent(youId, eventId);

      const resp = await fetchEvent(youId, eventId);
      expect(resp.status).toEqual(404);
      expect(resp.body).toMatchObject(eventNotFoundBody(eventId));
    });

    it("should retrieve an event that exists", async () => {
      const youId = randomUUID();
      await registerEvent({
        title: "John Burke",
        description: "johncann",
        startDate: '2023-08-01 00:00:01',
        endDate: '2023-08-05 00:00:01',
        color: "#72B01D",
        shouldHideAfterStartDate: false,
        isChatEnabled: false,
        latitude: 0,
        longitude: 0
      });
    });
  })

  const registerEvent = async (req: CreateEventRequest) => {
    return await request(app).post("/event").send({
      title: req.title,
      description: req.description,
      startDate: req.startDate,
      endDate: req.endDate,
      color: req.color,
      shouldHideAfterStartDate: req.shouldHideAfterStartDate,
      isChatEnabled: req.isChatEnabled
    });
  };

  const fetchEvent = async (youId: string, eventId: number) => {
    return await request(app)
      .get(`/event/${eventId}`)
      .set("Authorization", youId)
      .send();
  };
});


