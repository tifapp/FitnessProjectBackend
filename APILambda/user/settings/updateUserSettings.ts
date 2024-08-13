import { MySQLExecutableDriver, conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { UserSettings } from "TiFShared/domain-models/Settings.js"
import { TiFAPIRouter } from "../../router.js"

/**
 * Updates the user's settings with the specified fields in the settings object.
 * Fields that are not present in the settings object do not get updated and
 * retain their current value.
 *
 * @param conn the query executor to use
 * @param userId the id of the user to update settings for
 * @param settings the settings fields to update
 */
const updateUserSettingsSQL = (
  conn: MySQLExecutableDriver,
  userId: string,
  {
    isAnalyticsEnabled,
    isCrashReportingEnabled,
    pushNotificationTriggerIds,
    canShareArrivalStatus,
    eventCalendarStartOfWeekDay,
    eventCalendarDefaultLayout,
    eventPresetShouldHideAfterStartDate,
    eventPresetPlacemark,
    eventPresetDurations,
    version
  }: Partial<UserSettings>
) =>
  conn.executeResult(
    `
    INSERT INTO userSettings (
      userId,
      isAnalyticsEnabled,
      isCrashReportingEnabled,
      pushNotificationTriggerIds,
      canShareArrivalStatus,
      eventCalendarStartOfWeekDay,
      eventCalendarDefaultLayout,
      eventPresetShouldHideAfterStartDate,
      eventPresetPlacemark,
      eventPresetDurations,
      version
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
      pushNotificationTriggerIds,
      canShareArrivalStatus,
      eventCalendarStartOfWeekDay,
      eventCalendarDefaultLayout,
      eventPresetShouldHideAfterStartDate,
      eventPresetPlacemark,
      eventPresetDurations,
      version
    }
  )

export const saveUserSettings: TiFAPIRouter["saveUserSettings"] = ({ context: { selfId }, body: newSettings }) =>
  updateUserSettingsSQL(conn, selfId, newSettings)
    .mapSuccess(() => resp(204))
    .unwrap()
