import { randomUUID } from "crypto";
import {
  expectFailsCheckConstraint,
  resetDatabaseBeforeEach,
} from "./database";
import { conn } from "../dbconnection";
import {
  RegisterUserRequest,
  UserSettings,
  insertUser,
  userNotFoundBody,
} from "../users";
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

    it("should return the same status when already existing pending friend request", async () => {
      await friendUser(youId, otherId);
      const resp = await friendUser(youId, otherId);
      expect(resp.status).toEqual(200);
      expect(resp.body).toMatchObject({ status: "friend-request-pending" });
    });

    it("should return the same status when already friends", async () => {
      await friendUser(youId, otherId);
      await friendUser(otherId, youId);

      const resp = await friendUser(youId, otherId);
      expect(resp.status).toEqual(200);
      expect(resp.body).toMatchObject({ status: "friends" });
    });

    it("should have a friend status when the receiver sends a friend request to someone who sent them a pending friend request", async () => {
      await friendUser(youId, otherId);

      const resp = await friendUser(otherId, youId);
      expect(resp.status).toEqual(201);
      expect(resp.body).toMatchObject({ status: "friends" });
    });
  });

  describe("GetSelf tests", () => {
    it("404s when you have no account", async () => {
      const id = randomUUID();
      const resp = await fetchSelf(id);
      expect(resp.status).toEqual(404);
      expect(resp.body).toMatchObject(userNotFoundBody(id));
    });

    it("should be able to fetch your private account info", async () => {
      const id = randomUUID();
      const accountInfo = {
        id,
        name: "Matthew Hayes",
        handle: "little_chungus",
      };
      await registerUser(accountInfo);
      const resp = await fetchSelf(id);

      expect(resp.status).toEqual(200);
      expect(resp.body).toMatchObject(
        expect.objectContaining({
          ...accountInfo,
          bio: null,
          updatedAt: null,
          profileImageURL: null,
        })
      );
      expect(Date.parse(resp.body.creationDate)).not.toBeNaN();
    });
  });

  describe("Settings tests", () => {
    it("should 404 when gettings settings when user does not exist", async () => {
      const id = randomUUID();
      const resp = await fetchSettings(id);
      expect(resp.status).toEqual(404);
      expect(resp.body).toEqual(userNotFoundBody(id));
    });

    it("should return the default settings when settings not edited", async () => {
      const id = await registerTestUser();

      const resp = await fetchSettings(id);
      expect(resp.status).toEqual(200);
      expect(resp.body).toEqual({
        isAnalyticsEnabled: true,
        isCrashReportingEnabled: true,
        isEventNotificationsEnabled: true,
        isMentionsNotificationsEnabled: true,
        isChatNotificationsEnabled: true,
        isFriendRequestNotificationsEnabled: true,
      });
    });

    it("should 404 when attempting edit settings for non-existent user", async () => {
      const id = randomUUID();
      const resp = await editSettings(id, { isAnalyticsEnabled: false });
      expect(resp.status).toEqual(404);
      expect(resp.body).toMatchObject(userNotFoundBody(id));
    });

    it("should be able to retrieve the user's edited settings", async () => {
      const id = await registerTestUser();
      await editSettings(id, { isChatNotificationsEnabled: false });
      await editSettings(id, { isCrashReportingEnabled: false });

      const resp = await fetchSettings(id);
      expect(resp.status).toEqual(200);
      expect(resp.body).toMatchObject({
        isAnalyticsEnabled: true,
        isCrashReportingEnabled: false,
        isEventNotificationsEnabled: true,
        isMentionsNotificationsEnabled: true,
        isChatNotificationsEnabled: false,
        isFriendRequestNotificationsEnabled: true,
      });
    });

    const registerTestUser = async () => {
      const id = randomUUID();
      await registerUser({ id, name: "test", handle: "test" });
      return id;
    };
  });

  const editSettings = async (id: string, settings: Partial<UserSettings>) => {
    return await request(app)
      .patch("/user/self/settings")
      .set("Authorization", id)
      .send(settings);
  };

  const fetchSettings = async (id: string) => {
    return await request(app)
      .get("/user/self/settings")
      .set("Authorization", id)
      .send();
  };

  const fetchSelf = async (id: string) => {
    return await request(app).get("/user/self").set("Authorization", id).send();
  };

  const friendUser = async (user1Id: string, user2Id: string) => {
    return await request(app)
      .post(`/user/friend/${user2Id}`)
      .set("Authorization", user1Id)
      .send();
  };

  const registerUser = async (req: RegisterUserRequest) => {
    return await request(app).post("/user").set("Authorization", req.id).send({
      name: req.name,
      handle: req.handle,
    });
  };
});
