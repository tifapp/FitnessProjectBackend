import { SQLExecutable, conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { queryUserSettings } from "./getUserSettings.js"
import { UserSettings, UserSettingsSchema } from "./models.js"

/**
 * The default user settings, which enables all fields.
 */
export const DEFAULT_USER_SETTINGS = {
  isAnalyticsEnabled: true,
  isCrashReportingEnabled: true,
  isEventNotificationsEnabled: true,
  isMentionsNotificationsEnabled: true,
  isChatNotificationsEnabled: true,
  isFriendRequestNotificationsEnabled: true
} as const

/**
 * Updates the user's settings with the specified fields in the settings object.
 * Fields that are not present in the settings object do not get updated and
 * retain their current value.
 *
 * @param conn the query executor to use
 * @param userId the id of the user to update settings for
 * @param settings the settings fields to update
 */
const overwriteUserSettings = (
  conn: SQLExecutable,
  userId: string,
  settings: Partial<UserSettings>
) =>
  conn.transaction((tx) =>
    queryUserSettings(tx, userId)
      .flatMapSuccess(currentSettings => updateUserSettings(tx, userId, {
        ...currentSettings,
        ...settings
      }))
      .flatMapFailure(() => insertUserSettings(tx, userId, {
        ...DEFAULT_USER_SETTINGS,
        ...settings
      }))
  )

const updateUserSettings = (
  conn: SQLExecutable,
  userId: string,
  settings: UserSettings
) => conn.queryResults<UserSettings>(
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
)

const insertUserSettings = (
  conn: SQLExecutable,
  userId: string,
  settings: UserSettings
) => conn.queryResults<UserSettings>(
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
)

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const updateUserSettingsRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * updates the current user's settings
   */
  router.patchWithValidation(
    "/self/settings",
    { bodySchema: UserSettingsSchema.partial() },
    (req, res) =>
      overwriteUserSettings(conn, res.locals.selfId, req.body)
        .mapFailure((error) => res.status(500).json({ error }))
        .mapSuccess(() => res.status(204).send("No Content"))
  )
}
