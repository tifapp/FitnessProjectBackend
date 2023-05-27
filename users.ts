import express, { Response } from "express";
import {
  SQLExecutable,
  queryResults,
  hasResults,
  queryFirst,
} from "./dbconnection";
import { ServerEnvironment } from "./env";
import { withValidatedRequest } from "./validation";
import { z } from "zod";
import { Result } from "./utils";
import { Connection } from "@planetscale/database";

const userNotFoundResponse = (res: Response) => {
  res.status(404).json({ error: "user-not-found" });
};

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
      const result = await registerNewUser(
        environment.conn,
        Object.assign(data.body, { id: res.locals.selfId })
      );

      if (result.status === "error") {
        return res.status(400).json({ error: result.value });
      }
      return res.status(201).json(result.value);
    });
  });

  router.post("/friend/:userId", async (req, res) => {
    const result = await sendFriendRequest(
      environment.conn,
      res.locals.selfId,
      req.params.userId
    );
    return res
      .status(result.statusChanged ? 201 : 200)
      .json({ status: result.status });
  });

  router.get("/self", async (_, res) => {
    const user = await userWithId(environment.conn, res.locals.selfId);
    if (!user) {
      return userNotFoundResponse(res);
    }
    return res.status(200).json(user);
  });

  router.get("/self/settings", async (_, res) => {
    return userNotFoundResponse(res);
  });

  return router;
};

/**
 * A type representing the main user fields.
 */
export type User = {
  id: string;
  name: string;
  handle: string;
  bio?: string;
  profileImageURL?: string;
  creationDate: Date;
  updatedAt?: Date;
};

const userWithId = async (conn: SQLExecutable, userId: string) => {
  return await queryFirst<User>(conn, "SELECT * FROM user WHERE id = :userId", {
    userId,
  });
};

/**
 * A type representing the relationship status between 2 users.
 */
export type UserToProfileRelationStatus =
  | "not-friends"
  | "friend-request-pending"
  | "friends"
  | "blocked";

const sendFriendRequest = async (
  conn: Connection,
  senderId: string,
  receiverId: string
) => {
  return await conn.transaction(async (tx) => {
    const { youToThemStatus, themToYouStatus } = await twoWayUserRelation(
      tx,
      senderId,
      receiverId
    );

    if (
      youToThemStatus === "friends" ||
      youToThemStatus === "friend-request-pending"
    ) {
      return { statusChanged: false, status: youToThemStatus };
    }

    if (themToYouStatus === "friend-request-pending") {
      await makeFriends(tx, senderId, receiverId);
      return { statusChanged: true, status: "friends" };
    }

    await addPendingFriendRequest(tx, senderId, receiverId);
    return { statusChanged: true, status: "friend-request-pending" };
  });
};

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
  body: z.object({
    name: z.string().max(50),
    handle: z.string().regex(/^[a-z_0-9]{1,15}$/),
  }),
});

const registerNewUser = async (
  conn: Connection,
  request: RegisterUserRequest
): Promise<
  Result<{ id: string }, "user-already-exists" | "duplicate-handle">
> => {
  return await conn.transaction(async (tx) => {
    if (await userWithIdExists(tx, request.id)) {
      return { status: "error", value: "user-already-exists" };
    }

    if (await userWithHandleExists(tx, request.handle)) {
      return { status: "error", value: "duplicate-handle" };
    }

    await insertUser(tx, request);
    return { status: "success", value: { id: request.id } };
  });
};

const userWithHandleExists = async (conn: SQLExecutable, handle: string) => {
  return await hasResults(conn, "SELECT * FROM user WHERE handle = :handle", {
    handle,
  });
};

const userWithIdExists = async (conn: SQLExecutable, id: string) => {
  return await hasResults(conn, "SELECT * FROM user WHERE id = :id", { id });
};

export type RegisterUserRequest = {
  id: string;
  name: string;
  handle: string;
};

/**
 * Creates a new user in the database.
 *
 * @param conn see {@link SQLExecutable}
 * @param request see {@link RegisterUserRequest}
 */
export const insertUser = async (
  conn: SQLExecutable,
  request: RegisterUserRequest
) => {
  await conn.execute(
    `INSERT INTO user (id, name, handle) VALUES (:id, :name, :handle)`,
    request
  );
};
