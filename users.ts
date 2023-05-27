import express from "express";
import { z } from "zod";
import { SQLExecutable, hasResults, queryResults } from "./dbconnection.js";
import { ServerEnvironment } from "./env.js";
import { withValidatedRequest } from "./validation.js";

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const createUserRouter = (environment: ServerEnvironment) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    await withValidatedRequest(req, res, CreateUserSchema, async (data) => {
      await environment.conn.transaction(async (tx) => {
        if (await userWithIdExists(tx, res.locals.selfId)) {
          return res.status(400).json({ error: "user-already-exists" });
        }

        if (await userWithHandleExists(tx, req.body.handle)) {
          return res.status(400).json({ error: "duplicate-handle" });
        }

        await insertUser(tx, {
          id: res.locals.selfId,
          ...data,
        });
        return res.status(201).json({ id: res.locals.selfId });
      });
    });
  });

  router.post("/friend/:userId", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      const { youToThemStatus, themToYouStatus } = await twoWayUserRelation(
        tx,
        res.locals.selfId,
        req.params.userId
      );

      if (
        youToThemStatus === "friends" ||
        youToThemStatus === "friend-request-pending"
      ) {
        return res.status(200).json({ status: youToThemStatus });
      }

      if (themToYouStatus === "friend-request-pending") {
        await makeFriends(tx, res.locals.selfId, req.params.userId);
        return res.status(201).json({ status: "friends" });
      }

      await addPendingFriendRequest(tx, res.locals.selfId, req.params.userId);
      return res.status(201).json({ status: "friend-request-pending" });
    });
  });

  return router;
};

/**
 * A type representing the relationship status between 2 users.
 */
export type UserToProfileRelationStatus =
  | "not-friends"
  | "friend-request-pending"
  | "friends"
  | "blocked";

const twoWayUserRelation = async (
  conn: SQLExecutable,
  youId: string,
  themId: string
) => {
  const results = await queryResults<{
    id1: string;
    id2: string;
    status: UserToProfileRelationStatus;
  }>(
    conn,
    `
    SELECT * FROM userRelations ur 
    WHERE 
      (ur.id1 = :youId AND ur.id2 = :themId) 
      OR 
      (ur.id1 = :themId AND ur.id2 = :youId) 
    `,
    { youId, themId }
  );
  return {
    youToThemStatus: results.find(
      (res) => res.id1 === youId && res.id2 === themId
    )?.status,
    themToYouStatus: results.find(
      (res) => res.id1 === themId && res.id2 === youId
    )?.status,
  };
};

const makeFriends = async (conn: SQLExecutable, id1: string, id2: string) => {
  await conn.execute(
    `
    UPDATE userRelations 
    SET status = 'friends' 
    WHERE (id1 = :id1 AND id2 = :id2) OR (id1 = :id2 AND id2 = :id1)
  `,
    { id1, id2 }
  );
};

const addPendingFriendRequest = async (
  conn: SQLExecutable,
  senderId: string,
  receiverId: string
) => {
  await conn.execute(
    "INSERT INTO userRelations (id1, id2, status) VALUES (:senderId, :receiverId, 'friend-request-pending')",
    { senderId, receiverId }
  );
};

const CreateUserSchema = z.object({
  name: z.string().max(50),
  handle: z.string().regex(/^[a-z_0-9]{1,15}$/),
});

const userWithHandleExists = async (conn: SQLExecutable, handle: string) => {
  return await hasResults(conn, "SELECT * FROM user WHERE handle = :handle", {
    handle,
  });
};

const userWithIdExists = async (conn: SQLExecutable, id: string) => {
  return await hasResults(conn, "SELECT * FROM user WHERE id = :id", { id });
};

export type InsertUserRequest = {
  id: string;
  name: string;
  handle: string;
};

/**
 * Creates a new user in the database.
 *
 * @param conn see {@link SQLExecutable}
 * @param request see {@link InsertUserRequest}
 */
export const insertUser = async (
  conn: SQLExecutable,
  request: InsertUserRequest
) => {
  await conn.execute(
    `INSERT INTO user (id, name, handle) VALUES (:id, :name, :handle)`,
    request
  );
};
