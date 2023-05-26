import { randomUUID } from "crypto";
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach,
} from "./database";
import { conn } from "../dbconnection";
import { InsertUserRequest, insertUser } from "../users";
import request from "supertest";
import { createTestApp } from "./testApp";

describe("Users tests", () => {
  const app = createTestApp({ conn });
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
      const resp = await registerUser({
        id: userId,
        name: "Big Chungus",
        handle: "big_chungus",
      });

      expect(resp.status).toEqual(201);
      expect(resp.body).toMatchObject({ id: userId });
    });

    it("should not be able to create a user with an already existing id", async () => {
      const userId = randomUUID();
      await registerUser({
        id: userId,
        name: "Big Chungus",
        handle: "big_chungus",
      });

      const resp = await registerUser({
        id: userId,
        name: "Elon Musk",
        handle: "elon_musk",
      });
      expect(resp.status).toEqual(400);
      expect(resp.body).toMatchObject({ error: "user-already-exists" });
    });

    it("should not be able to create a user with a duplicate handle", async () => {
      await registerUser({
        id: randomUUID(),
        name: "Big Chungus",
        handle: "big_chungus",
      });

      const resp = await registerUser({
        id: randomUUID(),
        name: "Elon Musk",
        handle: "big_chungus",
      });
      expect(resp.status).toEqual(400);
      expect(resp.body).toMatchObject({ error: "duplicate-handle" });
    });
  });

  describe("FriendRequest tests", () => {
    const otherId = randomUUID();
    const youId = randomUUID();

    beforeEach(async () => {
      await registerUser({ id: youId, name: "Elon Musk", handle: "elon_musk" });
      await registerUser({ id: otherId, name: "A", handle: "a" });
    });

    it("should have a pending status when no prior relation between uses", async () => {
      const resp = await friendUser(youId, otherId);
      expect(resp.status).toEqual(201);
      expect(resp.body).toMatchObject({ status: "friend-request-pending" });
    });

    it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
      await friendUser(youId, otherId);
      const resp = await friendUser(otherId, youId);
      expect(resp.status).toEqual(201);
      expect(resp.body).toMatchObject({ status: "friends" });
    });
  });

  const friendUser = async (user1Id: string, user2Id: string) => {
    return await request(app)
      .post(`/user/friend/${user2Id}`)
      .set("Authorization", user1Id)
      .send();
  };

  const registerUser = async (req: InsertUserRequest) => {
    return await request(app).post("/user").set("Authorization", req.id).send({
      name: req.name,
      handle: req.handle,
    });
  };
});
