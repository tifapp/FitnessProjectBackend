import { SQLExecutable, conn, success } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { userWithIdExists } from "../SQL.js"
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
  userWithIdExists(conn, userId)
    .flatMapSuccess(() => conn.queryFirstResult<UserSettings>(
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
    ))

export const getUserSettingsRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * gets the current user's settings info
   */
  router.getWithValidation("/self/settings", {}, (_, res) =>
    queryUserSettings(conn, res.locals.selfId)
      .flatMapFailure(() => success(DEFAULT_USER_SETTINGS))
      .mapFailure((error) => { console.log("error is ,", error); return res.status(500).json({ error }) })
      .mapSuccess(settings => res.status(200).json(settings).send())
  )
}
