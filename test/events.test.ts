import { conn } from "../dbconnection";
import { createEvent } from "../events";
import { resetDatabaseBeforeEach } from "./database";
import { mockLocationCoordinate2D } from "./mockData";

describe("Events tests", () => {
  resetDatabaseBeforeEach();

  describe("CheckConstraint tests", () => {
    it("does not allow the end date to be before the start date", async () => {
      expect(async () => {
        return await createEvent({
          title: "no",
          description: "yay",
          startDate: new Date(1),
          endDate: new Date(0),
          color: "#72B01D",
          shouldHideAfterStartDate: true,
          isChatEnabled: true,
          ...mockLocationCoordinate2D(),
        });
      }).rejects.toEqual(expect.anything());
    });
  });
});
