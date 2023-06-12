import {
  SQLExecutable,
  hasResults,
  queryFirst,
  queryResults,
} from "../dbconnection.js";
import { Result } from "../utils.js";
import {
  DEFAULT_USER_SETTINGS,
  User,
  UserSettings,
  UserToProfileRelationStatus,
} from "./models.js";

/**
 * Updates the user's settings with the specified fields in the settings object.
 * Fields that are not present in the settings object do not get updated and
 * retain their current value.
 *
 * @param conn the query executor to use
 * @param userId the id of the user to update settings for
 * @param settings the settings fields to update
 */
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

/**
 * Queries a given user's settings. If the user has never edited their settings,
 * undefined will be returned if no errors occur.
 *
 * @param conn the query executor to use
 * @param id the id of the user
 * @returns a result that indicates that the user is not found, or their current settings
 */
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

/**
 * Queries the user with the given id.
 */
export const userWithId = async (conn: SQLExecutable, userId: string) => {
  return await queryFirst<User>(conn, "SELECT * FROM user WHERE id = :userId", {
    userId,
  });
};

/**
 * Sends a friend request to the user represented by `receiverId`. If the 2 users have no
 * prior relationship, then a `friend-request-pending` status will be returned, otherwise
 * a `friends` status will be returned if the receiver has sent a friend request to the sender.
 *
 * @param conn the query executor to use
 * @param senderId the id of the user who is sending the friend request
 * @param receiverId the id of the user who is receiving the friend request
 */
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

export type UpdateUserRequest = {
  selfId: string;
  name: string;
  bio: string;
  handle: string;
};

/**
 * Updates the current user's profile with the given settings.
 *
 * @param conn the query executor to use
 * @param request the fields of the user's profile to update
 */
export const updateUserProfile = async (
  conn: SQLExecutable,
  request: UpdateUserRequest
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

/**
 * Attempts to register a new user in the database.
 *
 * @param conn the query executor to use
 * @param request the initial fields required to create a user
 * @returns an object containing the id of the newly registered user
 */
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

export const userWithIdExists = async (conn: SQLExecutable, id: string) => {
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
