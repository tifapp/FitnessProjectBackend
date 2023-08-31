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
export type UserSettings = z.infer<typeof UserSettingsSchema>;

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
 * A type representing the main user fields.
 */
export type User = {
  id: string;
  name: string;
  handle: string;
  bio?: string;
  profileImageURL?: string;
  creationDate: Date;
  updatedAt?: Date;
};

/**
 * A type representing the relationship status between 2 users.
 */
export type UserToProfileRelationStatus =
  | "not-friends"
  | "friend-request-pending"
  | "friends"
  | "blocked";
