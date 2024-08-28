import type { NullablePartial } from "TiFBackendUtils"
import { MySQLExecutableDriver, conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env"
import { ValidatedRouter } from "../../validation"
import { UserSettings, UserSettingsSchema } from "./models"

/**
 * Updates the user's settings with the specified fields in the settings object.
 * Fields that are not present in the settings object do not get updated and
 * retain their current value.
 *
 * @param conn the query executor to use
 * @param userId the id of the user to update settings for
 * @param settings the settings fields to update
 */
const insertUserSettings = (
  conn: MySQLExecutableDriver,
  userId: string,
  {
    isAnalyticsEnabled = null,
    isCrashReportingEnabled = null,
    isEventNotificationsEnabled = null,
    isMentionsNotificationsEnabled = null,
    isChatNotificationsEnabled = null,
    isFriendRequestNotificationsEnabled = null
  }: NullablePartial<UserSettings>
) =>
  conn.executeResult(
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
      COALESCE(:isAnalyticsEnabled, 1), 
      COALESCE(:isCrashReportingEnabled, 1), 
      COALESCE(:isEventNotificationsEnabled, 1), 
      COALESCE(:isMentionsNotificationsEnabled, 1),
      COALESCE(:isChatNotificationsEnabled, 1), 
      COALESCE(:isFriendRequestNotificationsEnabled, 1)
    )
    ON DUPLICATE KEY UPDATE 
      isAnalyticsEnabled = COALESCE(:isAnalyticsEnabled, isAnalyticsEnabled), 
      isCrashReportingEnabled = COALESCE(:isCrashReportingEnabled, isCrashReportingEnabled),
      isEventNotificationsEnabled = COALESCE(:isEventNotificationsEnabled, isEventNotificationsEnabled),
      isMentionsNotificationsEnabled = COALESCE(:isMentionsNotificationsEnabled, isMentionsNotificationsEnabled),
      isChatNotificationsEnabled = COALESCE(:isChatNotificationsEnabled, isChatNotificationsEnabled),
      isFriendRequestNotificationsEnabled = COALESCE(:isFriendRequestNotificationsEnabled, isFriendRequestNotificationsEnabled);    
  `,
    {
      userId,
      isAnalyticsEnabled,
      isCrashReportingEnabled,
      isEventNotificationsEnabled,
      isMentionsNotificationsEnabled,
      isChatNotificationsEnabled,
      isFriendRequestNotificationsEnabled
    }
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
      insertUserSettings(conn, res.locals.selfId, req.body)
        .mapSuccess(() => res.status(204).send())
  )
}
