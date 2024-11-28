import { z } from "zod"
import { DBuserRelationships } from "../DBTypes"

export type UserRelationshipStatus =
  | "not-friends"
  | "current-user"
  | DBuserRelationships["status"]

export type UserRelationshipPair = Pick<
  DBuserRelationships,
  "fromUserId" | "toUserId"
>

export type UserRelations = {
  fromThemToYou: UserRelationshipStatus
  fromYouToThem: UserRelationshipStatus
}

export const BlockedYouUserRelationsSchema = z
  .object({
    fromThemToYou: z.literal("blocked")
  })
  .transform(() => "blocked-you" as const)

const BlockedThemUserRelationsSchema = z
  .object({
    fromYouToThem: z.literal("blocked")
  })
  .transform(() => "blocked-them" as const)

const NotFriendsUserRelationsSchema = z
  .object({
    fromYouToThem: z.literal("not-friends"),
    fromThemToYou: z.literal("not-friends")
  })
  .transform(() => "not-friends" as const)

const FriendRequestSentUserRelationsSchema = z
  .object({
    fromYouToThem: z.literal("friend-request-pending"),
    fromThemToYou: z.literal("not-friends")
  })
  .transform(() => "friend-request-sent" as const)

const FriendRequestReceivedUserRelationsSchema = z
  .object({
    fromThemToYou: z.literal("friend-request-pending"),
    fromYouToThem: z.literal("not-friends")
  })
  .transform(() => "friend-request-received" as const)

const FriendsUserRelationsSchema = z
  .object({
    fromThemToYou: z.literal("friends"),
    fromYouToThem: z.literal("friends")
  })
  .transform(() => "friends" as const)

const CurrentUserUserRelationsSchema = z
  .object({
    fromThemToYou: z.literal("current-user"),
    fromYouToThem: z.literal("current-user")
  })
  .transform(() => "current-user" as const)

export const UserRelationsSchema = z.union([
  BlockedYouUserRelationsSchema,
  BlockedThemUserRelationsSchema,
  NotFriendsUserRelationsSchema,
  FriendRequestSentUserRelationsSchema,
  FriendRequestReceivedUserRelationsSchema,
  FriendsUserRelationsSchema,
  CurrentUserUserRelationsSchema
])
