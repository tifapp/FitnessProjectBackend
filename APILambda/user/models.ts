import { UserHandle } from "TiFBackendUtils"

/**
 * A type representing the main user fields.
 */ // use zod schema for validation then transformation
export type DatabaseUser = {
  id: string // assign to a type for clarity
  name: string
  handle: UserHandle
  bio?: string
  profileImageURL?: string // url type
  creationDate: Date
  updatedAt?: Date
}

/**
 * A type representing the relationship status between 2 users.
 */
export type UserToProfileRelationStatus =
  | "not-friends"
  | "friend-request-pending"
  | "friends"
  | "blocked"
