import {
  NullablePartial,
  RequireNotNull,
  SQLExecutable,
  conn
} from "TiFBackendUtils"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { UserSettings, UserSettingsSchema } from "./models.js"
import { z } from "zod"

const UpdateUserSettingsRequestSchema = UserSettingsSchema.omit({
  updatedDateTime: true
}).partial()

type UpdateUserSettingsRequest = NullablePartial<
  z.infer<typeof UpdateUserSettingsRequestSchema>
>

type DBUserSettingsUpdatedDateTime = Pick<
  RequireNotNull<UserSettings>,
  "updatedDateTime"
>

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
  conn: SQLExecutable,
  userId: string,
  {
    isAnalyticsEnabled = null,
    isCrashReportingEnabled = null,
    isEventNotificationsEnabled = null,
    isMentionsNotificationsEnabled = null,
    isChatNotificationsEnabled = null,
    isFriendRequestNotificationsEnabled = null
  }: UpdateUserSettingsRequest
) =>
  conn.transaction((tx) => {
    return tx
      .queryResults(
        `
      INSERT INTO userSettings (
        userId,
        isAnalyticsEnabled,
        isCrashReportingEnabled,
        isEventNotificationsEnabled,
        isMentionsNotificationsEnabled,
        isChatNotificationsEnabled,
        isFriendRequestNotificationsEnabled,
        updatedDateTime
      ) VALUES (
        :userId,
        COALESCE(:isAnalyticsEnabled, 1),
        COALESCE(:isCrashReportingEnabled, 1),
        COALESCE(:isEventNotificationsEnabled, 1),
        COALESCE(:isMentionsNotificationsEnabled, 1),
        COALESCE(:isChatNotificationsEnabled, 1),
        COALESCE(:isFriendRequestNotificationsEnabled, 1),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        isAnalyticsEnabled = COALESCE(:isAnalyticsEnabled, isAnalyticsEnabled),
        isCrashReportingEnabled = COALESCE(:isCrashReportingEnabled, isCrashReportingEnabled),
        isEventNotificationsEnabled = COALESCE(:isEventNotificationsEnabled, isEventNotificationsEnabled),
        isMentionsNotificationsEnabled = COALESCE(:isMentionsNotificationsEnabled, isMentionsNotificationsEnabled),
        isChatNotificationsEnabled = COALESCE(:isChatNotificationsEnabled, isChatNotificationsEnabled),
        isFriendRequestNotificationsEnabled = COALESCE(:isFriendRequestNotificationsEnabled, isFriendRequestNotificationsEnabled),
        updatedDateTime = NOW()
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
      .flatMapSuccess(() => {
        return tx
          .queryFirstResult<DBUserSettingsUpdatedDateTime>(
            "SELECT updatedDateTime FROM userSettings WHERE userId = :userId",
            { userId }
          )
          .mapSuccess((row) => row.updatedDateTime)
      })
  })

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
    { bodySchema: UpdateUserSettingsRequestSchema },
    (req, res) =>
      insertUserSettings(conn, res.locals.selfId, req.body)
        .mapSuccess((updatedDateTime) => {
          return res.status(200).json({ updatedDateTime }).send()
        })
        .mapFailure(() => res.status(500).send())
  )
}
