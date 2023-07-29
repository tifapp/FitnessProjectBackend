import { conn } from "../dbconnection";
import { insertEvent } from "../events";
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach,
} from "./database";
import { mockLocationCoordinate2D } from "./mockData";

describe("Events tests", () => {
  resetDatabaseBeforeEach();

  describe("Insert event CheckConstraint test", () => {
    it("does not allow the end date to be before the start date", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertEvent(conn, {
          title: "no",
          description: "yay",
          startTimestamp: new Date(1),
          endTimestamp: new Date(0),
          color: "#72B01D",
          shouldHideAfterStartDate: true,
          isChatEnabled: true,
          ...mockLocationCoordinate2D(),
        });
      });
    });
  });
  /*
  inside test:
  const result = await request(app).get("/event/chat/9").set("Authorization", req.id);
  */
});
