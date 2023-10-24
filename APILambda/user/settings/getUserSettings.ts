import { SQLExecutable, conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { UserSettings } from "./models.js"
import { DEFAULT_USER_SETTINGS } from "./updateUserSettings.js"

/**
 * Queries a given user's settings. If the user has never edited their settings,
 * undefined will be returned if no errors occur.
 *
 * @param conn the query executor to use
 * @param id the id of the user
 * @returns a result that indicates that the user is not found, or their current settings
 */
export const queryUserSettings = (conn: SQLExecutable, userId: string) =>
  conn.queryFirstResult<UserSettings>(
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
  ).withFailure("settings-not-found" as const)

export const getCurrentUserSettingsRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * gets the current user's settings info
   */
  router.getWithValidation("/self/settings", {}, (_, res) =>
    conn.transaction((tx) => queryUserSettings(tx, res.locals.selfId))
      .mapFailure((error) => res.status(500).json({ error }))
      .mapSuccess(settings => res.status(200).json(settings ?? DEFAULT_USER_SETTINGS).send())
  )
}
