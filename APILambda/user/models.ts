/**
 * A type representing the main user fields.
 */ // use zod schema for validation then transformation
export type DatabaseUser = {
  id: string // assign to a type for clarity
  name: string
  handle: string // userhandle class
  bio?: string
  profileImageURL: string | null// url type
  creationDate: Date
  updatedAt: Date | null
}

/**
 * A type representing the relationship status between 2 users.
 */
export type UserToProfileRelationStatus =
  | "not-friends"
  | "friend-request-pending"
  | "friends"
  | "blocked"
