/**
 * A type representing the main user fields.
 */ // use zod schema for validation then transformation
export type DatabaseUser = {
  id: string // assign to a type for clarity
  name: string
  handle: string // userhandle class
  bio?: string
  profileImageURL?: string // url type
  creationDate: Date
  updatedAt?: Date
}

/**
 * A type representing the relationship status between 2 users.
 */
export type UserRelationStatus =
  | "not-friends"
  | "friend-request-pending"
  | "friends"
  | "blocked"

export type UserToUserRelation = {
  themToYou: UserRelationStatus
  youToThem: UserRelationStatus
}
