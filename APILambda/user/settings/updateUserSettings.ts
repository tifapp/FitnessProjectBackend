import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
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
    isAnalyticsEnabled,
    isCrashReportingEnabled
    // TODO: Update with models from tifshared api
  }: UserSettings
) =>
  // TODO: Update with models from tifshared api
  conn.executeResult(
    `
    INSERT INTO userSettings (
      userId, 
      isAnalyticsEnabled, 
      isCrashReportingEnabled
    ) VALUES (
      :userId, 
      COALESCE(:isAnalyticsEnabled, 1), 
      COALESCE(:isCrashReportingEnabled, 1)
    )
    ON DUPLICATE KEY UPDATE 
      isAnalyticsEnabled = COALESCE(:isAnalyticsEnabled, isAnalyticsEnabled), 
      isCrashReportingEnabled = COALESCE(:isCrashReportingEnabled, isCrashReportingEnabled);    
  `,
    {
      userId,
      isAnalyticsEnabled,
      isCrashReportingEnabled
      // TODO: Update with models from tifshared api
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
