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
    const app = createTestApp({ conn });

    it("should 400 on invalid request body", async () => {
      request(app)
        .post("/user")
        .set("Authorization", randomUUID())
        .send({
          name: 1,
          handle: "iusdbdkjbsjbdjsbdsdsudbusybduysdusdudbsuyb",
        })
        .expect(400);
    });

    it("should be able to create a new user posting to /user when user does not exist", async () => {
      const userId = randomUUID();
      const body = {
        name: "Big Chungus",
        handle: "big_chungus",
      };
      const resp = await request(app)
        .post("/user")
        .set("Authorization", userId)
        .send(body);

      expect(resp.status).toEqual(201);
      expect(resp.body).toMatchObject({ id: userId });
    });

    it("should not be able to create a user with an already existing id", async () => {
      const userId = randomUUID();
      await request(app)
        .post("/user")
        .set("Authorization", userId)
        .send({
          name: "Big Chungus",
          handle: "big_chungus",
        })
        .expect(201);

      const resp = await request(app)
        .post("/user")
        .set("Authorization", userId)
        .send({
          name: "Elon Musk",
          handle: "elon_musk",
        })
        .expect(400);
      expect(resp.body).toMatchObject({ error: "user-already-exists" });
    });

    it("should not be able to create a user with a duplicate handle", async () => {
      await request(app)
        .post("/user")
        .set("Authorization", randomUUID())
        .send({
          name: "Big Chungus",
          handle: "big_chungus",
        })
        .expect(201);

      const resp = await request(app)
        .post("/user")
        .set("Authorization", randomUUID())
        .send({
          name: "Elon Musk",
          handle: "big_chungus",
        })
        .expect(400);
      expect(resp.body).toMatchObject({ error: "duplicate-handle" });
    });
  });
});
