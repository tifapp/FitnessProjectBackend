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

export const userNotFoundBody = (userId: string) => ({
  userId,
  error: "user-not-found",
});

export const userNotFoundResponse = (res: Response, userId: string) => {
  res.status(404).json(userNotFoundBody(userId));
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
      const result = await environment.conn.transaction(async (tx) => {
        const registerReq = Object.assign(data.body, { id: res.locals.selfId });
        return await registerNewUser(tx, registerReq);
      });

      if (result.status === "error") {
        return res.status(400).json({ error: result.value });
      }
      return res.status(201).json(result.value);
    });
  });

  router.post("/friend/:userId", async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      return await sendFriendRequest(tx, res.locals.selfId, req.params.userId);
    });
    return res
      .status(result.statusChanged ? 201 : 200)
      .json({ status: result.status });
  });

  router.get("/self", async (_, res) => {
    const user = await userWithId(environment.conn, res.locals.selfId);
    if (!user) {
      return userNotFoundResponse(res, res.locals.selfId);
    }
    return res.status(200).json(user);
  });

  router.get("/self/settings", async (_, res) => {
    const settings = await environment.conn.transaction(async (tx) => {
      return await userSettingsWithId(tx, res.locals.selfId);
    });
    if (settings.status === "error") {
      return userNotFoundResponse(res, res.locals.selfId);
    }
    return res.status(200).json(settings.value ?? DEFAULT_USER_SETTINGS);
  });

  router.patch("/self/settings", async (req, res) => {
    await withValidatedRequest(
      req,
      res,
      PatchUserSettingsRequestSchema,
      async (data) => {
        const result = await environment.conn.transaction(async (tx) => {
          return await overwriteUserSettings(tx, res.locals.selfId, data.body);
        });
        if (result.status === "error") {
          return userNotFoundResponse(res, res.locals.selfId);
        }
        return res.status(204).send();
      }
    );
  });

  router.patch("/self", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      const result = await updateSelf(tx, {
        selfId: res.locals.selfId,
        ...req.body,
      });
      console.log("result:" + result);
      return res.status(200).json({ result });
    });
  });
  return router;
};

/**
 * A zod schema for {@link UserSettingsSchema}.
 */
export const UserSettingsSchema = z.object({
  isAnalyticsEnabled: z.boolean(),
  isCrashReportingEnabled: z.boolean(),
  isEventNotificationsEnabled: z.boolean(),
  isMentionsNotificationsEnabled: z.boolean(),
  isChatNotificationsEnabled: z.boolean(),
  isFriendRequestNotificationsEnabled: z.boolean(),
});

/**
 * A type representing a user's settings.
 */
export type UserSettings = z.infer<typeof UserSettingsSchema>;

/**
 * The default user settings, which enables all fields.
 */
export const DEFAULT_USER_SETTINGS = {
  isAnalyticsEnabled: true,
  isCrashReportingEnabled: true,
  isEventNotificationsEnabled: true,
  isMentionsNotificationsEnabled: true,
  isChatNotificationsEnabled: true,
  isFriendRequestNotificationsEnabled: true,
} as const;

const PatchUserSettingsRequestSchema = z.object({
  body: UserSettingsSchema.partial(),
});

const overwriteUserSettings = async (
  conn: SQLExecutable,
  userId: string,
  settings: Partial<UserSettings>
): Promise<Result<void, "user-not-found">> => {
  const currentSettingsResult = await userSettingsWithId(conn, userId);
  if (currentSettingsResult.status === "error") {
    return currentSettingsResult;
  }

  if (!currentSettingsResult.value) {
    await insertUserSettings(conn, userId, {
      ...DEFAULT_USER_SETTINGS,
      ...settings,
    });
    return { status: "success", value: undefined };
  }
  await updateUserSettings(conn, userId, {
    ...currentSettingsResult.value,
    ...settings,
  });
  return { status: "success", value: undefined };
};

const updateUserSettings = async (
  conn: SQLExecutable,
  userId: string,
  settings: UserSettings
) => {
  await conn.execute(
    `
    UPDATE userSettings 
    SET 
      isAnalyticsEnabled = :isAnalyticsEnabled,
      isCrashReportingEnabled = :isCrashReportingEnabled,
      isEventNotificationsEnabled = :isEventNotificationsEnabled,
      isMentionsNotificationsEnabled = :isMentionsNotificationsEnabled,
      isChatNotificationsEnabled = :isChatNotificationsEnabled,
      isFriendRequestNotificationsEnabled = :isFriendRequestNotificationsEnabled
    WHERE 
      userId = :userId 
  `,
    { userId, ...settings }
  );
};

const insertUserSettings = async (
  conn: SQLExecutable,
  userId: string,
  settings: UserSettings
) => {
  await conn.execute(
    `
    INSERT INTO userSettings (
      userId, 
      isAnalyticsEnabled, 
      isCrashReportingEnabled,
      isEventNotificationsEnabled, 
      isMentionsNotificationsEnabled, 
      isChatNotificationsEnabled, 
      isFriendRequestNotificationsEnabled
    ) VALUES (
      :userId, 
      :isAnalyticsEnabled, 
      :isCrashReportingEnabled, 
      :isEventNotificationsEnabled, 
      :isMentionsNotificationsEnabled,
      :isChatNotificationsEnabled, 
      :isFriendRequestNotificationsEnabled
    )
  `,
    { userId, ...settings }
  );
};

const userSettingsWithId = async (
  conn: SQLExecutable,
  id: string
): Promise<Result<UserSettings | undefined, "user-not-found">> => {
  if (!(await userWithIdExists(conn, id))) {
    return { status: "error", value: "user-not-found" };
  }
  return { status: "success", value: await queryUserSettings(conn, id) };
};

const queryUserSettings = async (conn: SQLExecutable, userId: string) => {
  return await queryFirst<UserSettings>(
    conn,
    `
    SELECT 
      isAnalyticsEnabled, 
      isCrashReportingEnabled, 
      isEventNotificationsEnabled, 
      isMentionsNotificationsEnabled, 
      isChatNotificationsEnabled, 
      isFriendRequestNotificationsEnabled
    FROM userSettings
    WHERE userId = :userId
  `,
    { userId }
  );
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
  conn: SQLExecutable,
  senderId: string,
  receiverId: string
) => {
  const { youToThemStatus, themToYouStatus } = await twoWayUserRelation(
    conn,
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
    await makeFriends(conn, senderId, receiverId);
    return { statusChanged: true, status: "friends" };
  }

  await addPendingFriendRequest(conn, senderId, receiverId);
  return { statusChanged: true, status: "friend-request-pending" };
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

export type userUpdateRequest = {
  selfId: string;
  name: string;
  bio: string;
  handle: string;
};

export const updateSelf = async (
  conn: SQLExecutable,
  request: userUpdateRequest
) => {
  await conn.execute(
    `
    UPDATE user 
    SET name = :name, bio = :bio, handle = :handle
    WHERE id = :selfId 
  `,
    request
  );
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
  conn: SQLExecutable,
  request: RegisterUserRequest
): Promise<
  Result<{ id: string }, "user-already-exists" | "duplicate-handle">
> => {
  if (await userWithIdExists(conn, request.id)) {
    return { status: "error", value: "user-already-exists" };
  }

  if (await userWithHandleExists(conn, request.handle)) {
    return { status: "error", value: "duplicate-handle" };
  }

  await insertUser(conn, request);
  return { status: "success", value: { id: request.id } };
};

const userWithHandleExists = async (conn: SQLExecutable, handle: string) => {
  return await hasResults(
    conn,
    "SELECT TRUE FROM user WHERE handle = :handle",
    { handle }
  );
};

const userWithIdExists = async (conn: SQLExecutable, id: string) => {
  return await hasResults(conn, "SELECT TRUE FROM user WHERE id = :id", { id });
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
