import { randomUUID } from "crypto";
import { conn } from "../dbconnection";
import { insertEvent } from "../events";
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach,
} from "./database";
import { createTestEvent } from "./helpers/events";
import { mockLocationCoordinate2D } from "./mockData";
import { createTestApp } from "./testApp";
import { userNotFoundBody } from "../user";
import { registerUser } from "./helpers/users";

describe("Events tests", () => {
  const app = createTestApp({conn})
  resetDatabaseBeforeEach();

  describe("CheckConstraint tests", () => {
    it("does not allow the end date to be before the start date", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertEvent(conn, {
          title: "no",
          description: "yay",
          startTimeStamp: 1,
          endTimeStamp: 0,
          color: "#72B01D",
          shouldHideAfterStartDate: true,
          isChatEnabled: true,
          ...mockLocationCoordinate2D(),
        }, randomUUID());
      });
    });
  });
  describe("createEvent tests", () => {
    it("does not allow a user to create an event if the user doesn't exist", async () => {
      const id = randomUUID();
      const resp = await createTestEvent(app, id,
      {
        title: "no",
        description: "yay",
        startTimeStamp: 0,
        endTimeStamp: 1000,
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...mockLocationCoordinate2D()
      });
      expect(resp.status).toEqual(404);
      expect(resp.body).toEqual(userNotFoundBody(id));
    });

    it("should allow a user to create an event if the user exists", async () => {
      const hostId = randomUUID();
      await registerUser(app, 
        {
          id: hostId,
          name: 'name',
          handle: 'handle'
        });
      const resp = await createTestEvent(app, hostId,
      {
        title: "no",
        description: "yay",
        startTimeStamp: 0,
        endTimeStamp: 1000,
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...mockLocationCoordinate2D()
      });
      expect(resp.status).toEqual(201);
      expect(resp.body).toMatchObject({id: expect.any(Number)});
    });
  })
});
