import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { UserSettings } from "TiFShared/domain-models/Settings"
import { TiFAPIRouterExtension } from "../../router"
import { queryUserSettings } from "./userSettingsQuery"

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
    `INSERT INTO userSettings (
      userId,
      isAnalyticsEnabled,
      isCrashReportingEnabled,
      canShareArrivalStatus,
      eventCalendarStartOfWeekDay,
      eventCalendarDefaultLayout,
      eventPresetShouldHideAfterStartDate,
      eventPresetPlacemark,
      eventPresetDurations,
      pushNotificationTriggerIds
    ) VALUES (
      :userId,
      COALESCE(:isAnalyticsEnabled, 1),
      COALESCE(:isCrashReportingEnabled, 1),
      COALESCE(:canShareArrivalStatus, 1),
      COALESCE(:eventCalendarStartOfWeekDay, 'monday'),
      COALESCE(:eventCalendarDefaultLayout, 'week-layout'),
      COALESCE(:eventPresetShouldHideAfterStartDate, 0),
      COALESCE(:eventPresetPlacemark, NULL),
      COALESCE(:eventPresetDurations, JSON_ARRAY(900, 1800, 2700, 3600, 5400)),
      COALESCE(:pushNotificationTriggerIds, JSON_ARRAY(
        'friend-request-received', 
        'friend-request-accepted', 
        'user-entered-region', 
        'event-attendance-headcount', 
        'event-periodic-arrivals', 
        'event-starting-soon', 
        'event-started', 
        'event-ended',
        'event-name-changed',
        'event-description-changed',
        'event-time-changed',
        'event-location-changed',
        'event-cancelled'
      ))
    ) ON DUPLICATE KEY UPDATE 
      isAnalyticsEnabled = COALESCE(:isAnalyticsEnabled, isAnalyticsEnabled),
      isCrashReportingEnabled = COALESCE(:isCrashReportingEnabled, isCrashReportingEnabled),
      canShareArrivalStatus = COALESCE(:canShareArrivalStatus, canShareArrivalStatus),
      eventCalendarStartOfWeekDay = COALESCE(:eventCalendarStartOfWeekDay, eventCalendarStartOfWeekDay),
      eventCalendarDefaultLayout = COALESCE(:eventCalendarDefaultLayout, eventCalendarDefaultLayout),
      eventPresetShouldHideAfterStartDate = COALESCE(:eventPresetShouldHideAfterStartDate, eventPresetShouldHideAfterStartDate),
      eventPresetPlacemark = COALESCE(:eventPresetPlacemark, eventPresetPlacemark),
      eventPresetDurations = COALESCE(:eventPresetDurations, eventPresetDurations),
      pushNotificationTriggerIds = COALESCE(:pushNotificationTriggerIds, pushNotificationTriggerIds),
      version = version + 1;    
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

export const saveUserSettings: TiFAPIRouterExtension["saveUserSettings"] = ({ context: { selfId }, body: newSettings }) =>
  updateUserSettingsSQL(conn, selfId, newSettings)
    .flatMapSuccess(() => queryUserSettings(conn, selfId))
    .observeSuccess(r => console.warn("look at this update ", r))
    .mapSuccess((updatedSettings) => resp(200, updatedSettings))
    .unwrap()
