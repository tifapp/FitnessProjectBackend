import { DBuserRelations } from "../DBTypes"

/**
 * A type representing the relationship status between 2 users.
 */
type UserRelationshipStatus =
  | "not-friends"
  | DBuserRelations["status"]

export type UserRelationship =
  {
    fromThemToYou: UserRelationshipStatus
    fromYouToThem: UserRelationshipStatus
  }

export type UserRelationsInput = Pick<DBuserRelations, "fromUserId" | "toUserId">
