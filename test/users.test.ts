import { randomUUID } from "crypto";
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach,
} from "./database";
import { conn } from "../dbconnection";
import { insertUser } from "../users";
import request from "supertest";
import { createTestApp } from "./testApp";

describe("Users tests", () => {
  resetDatabaseBeforeEach();

  describe("CheckConstraint tests", () => {
    it("should not allow a handle with non-lowercase alpha numeric characters", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn, {
          id: randomUUID(),
          name: "Big Chungus",
          handle: "(*(*&(SJK",
        });
      });
    });

    it("should not allow an empty handle", async () => {
      await expectFailsCheckConstraint(async () => {
        await insertUser(conn, {
          id: randomUUID(),
          name: "Big Chungus",
          handle: "",
        });
      });
    });
  });

  describe("CreateUser tests", () => {
    it("should be able to create a new user posting to /user when user does not exist", async () => {
      const userId = randomUUID();
      const body = {
        name: "Big Chungus",
        handle: "big_chungus",
      };
      const resp = await request(createTestApp({ conn }))
        .post("/user")
        .set("Authorization", userId)
        .send(body);

      expect(resp.status).toEqual(201);
      expect(resp.body).toMatchObject({ id: userId });
    });
  });
});
