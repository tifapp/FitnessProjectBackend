import { z } from "zod"

/**
 * A zod schema for {@link UserSettingsSchema}.
 */
export const UserSettingsSchema = z.object({
  isAnalyticsEnabled: z.boolean(),
  isCrashReportingEnabled: z.boolean(),
  isEventNotificationsEnabled: z.boolean(),
  isMentionsNotificationsEnabled: z.boolean(),
  isChatNotificationsEnabled: z.boolean(),
  isFriendRequestNotificationsEnabled: z.boolean()
})

/**
 * A type representing a user's settings.
 */
export type UserSettings = z.infer<typeof UserSettingsSchema>
