import { DBuserRelations } from "../Planetscale/entities.js"

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
