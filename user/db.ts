import { z } from "zod";
import {
  SQLExecutable,
  queryFirst,
  queryResults,
  hasResults,
} from "../dbconnection";
import { Result } from "../utils";
import {
  DEFAULT_USER_SETTINGS,
  User,
  UserSettings,
  UserToProfileRelationStatus,
} from "./models";

export const overwriteUserSettings = async (
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

export const userSettingsWithId = async (
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

export const userWithId = async (conn: SQLExecutable, userId: string) => {
  return await queryFirst<User>(conn, "SELECT * FROM user WHERE id = :userId", {
    userId,
  });
};

export const sendFriendRequest = async (
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

export const registerNewUser = async (
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
