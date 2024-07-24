import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { UserSettings } from "TiFShared/domain-models/Settings"
import { TiFAPIRouter } from "../../router"

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
  // TODO: Update with models from tifshared api
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
      COALESCE(:isCrashReportingEnabled, 1)
    )
    ON DUPLICATE KEY UPDATE 
      isAnalyticsEnabled = COALESCE(:isAnalyticsEnabled, isAnalyticsEnabled), 
      isCrashReportingEnabled = COALESCE(:isCrashReportingEnabled, isCrashReportingEnabled);    
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
