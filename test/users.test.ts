import { randomUUID } from "crypto";
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach,
} from "./database";
import { conn } from "../dbconnection";
import { createUser } from "../users";

describe("Users tests", () => {
  resetDatabaseBeforeEach();

  describe("CheckConstraint tests", () => {
    it("should not allow a handle with non-lowercase alpha numeric characters", async () => {
      await expectFailsCheckConstraint(async () => {
        await createUser(conn, {
          id: randomUUID(),
          name: "Big Chungus",
          handle: "(*(*&(SJK",
          email: "bigchungus@gmail.com",
          phoneNumber: undefined,
        });
      });
    });

    it("should not allow no phone number and no email at the same time", async () => {
      await expectFailsCheckConstraint(async () => {
        await createUser(conn, {
          id: randomUUID(),
          name: "Big Chungus",
          handle: "big_chungus",
          email: undefined,
          phoneNumber: undefined,
        });
      });
    });
  });
});
