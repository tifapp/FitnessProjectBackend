import { randomInt, randomUUID } from "crypto";
import { conn } from "../dbconnection";
import { insertEvent } from "../events";
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach,
} from "./database";
import { createTestEvent, getTestEvent } from "./helpers/events";
import { mockLocationCoordinate2D } from "./mockData";
import { createTestApp } from "./testApp";
import { userNotFoundBody } from "../user";
import { registerUser } from "./helpers/users";
import request from "superagent";

describe("Events tests", () => {
  const app = createTestApp({ conn });
  resetDatabaseBeforeEach();

  describe("CheckConstraint tests", () => {
    it("does not allow the end date to be before the start date", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertEvent(
          conn,
          {
            title: "no",
            description: "yay",
            startTimestamp: 1,
            endTimestamp: 0,
            color: "#72B01D",
            shouldHideAfterStartDate: true,
            isChatEnabled: true,
            ...mockLocationCoordinate2D(),
          },
          randomUUID()
        );
      });
    });
  });
  describe("createEvent tests", () => {
    it("does not allow a user to create an event if the user doesn't exist", async () => {
      const id = randomUUID();
      const resp = await createTestEvent(app, id, {
        title: "no",
        description: "yay",
        startTimestamp: 0,
        endTimestamp: 1000,
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...mockLocationCoordinate2D(),
      });
      expect(resp.status).toEqual(404);
      expect(resp.body).toEqual(userNotFoundBody(id));
    });

    it("should allow a user to create an event if the user exists", async () => {
      const hostId = randomUUID();
      await registerUser(app, {
        id: hostId,
        name: "name",
        handle: "handle",
      });
      const resp = await createTestEvent(app, hostId, {
        title: "no",
        description: "yay",
        startTimestamp: 0,
        endTimestamp: 1000,
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...mockLocationCoordinate2D(),
      });
      expect(resp.status).toEqual(201);
      expect(resp.body).toMatchObject({ id: expect.any(Number) });
    });
  });

  describe("GetSingleEvent tests", () => {
    it("should return 404 if the event doesnt exist", async () => {
      const eventId = randomInt(1000);
      const userId = randomUUID();
      const resp = await getTestEvent(app, userId, eventId);

      expect(resp.status).toEqual(404);
      expect(resp.body).toMatchObject({ error: "event-not-found", eventId });
    });
  });
});
