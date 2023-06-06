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

describe("Events tests", () => {
  const app = createTestApp({conn})
  resetDatabaseBeforeEach();

  // describe("CheckConstraint tests", () => {
    // it("does not allow the end date to be before the start date", async () => {
    //   await expectFailsCheckConstraint(async () => {
    //     await insertEvent(conn, {
    //       title: "no",
    //       description: "yay",
    //       startDate: new Date(1),
    //       endDate: new Date(0),
    //       color: "#72B01D",
    //       shouldHideAfterStartDate: true,
    //       isChatEnabled: true,
    //       ...mockLocationCoordinate2D(),
    //     });
    //   });
    // });
  // });
  describe("createEvent tests", () => {
    it("does not allow a user to create an event if the user doesn't exist", async () => {
      const id = randomUUID();
      const resp = await createTestEvent(app, id,
      {
        title: "no",
        description: "yay",
        startDate: '1970-01-01 00:00:00',
        endDate: '1970-02-01 00:00:00',
        color: "#72B01D",
        shouldHideAfterStartDate: true,
        isChatEnabled: true,
        ...mockLocationCoordinate2D()
      });
      expect(resp.status).toEqual(404);
      expect(resp.body).toEqual(userNotFoundBody(id));
    });
  })
});
