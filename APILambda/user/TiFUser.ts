import { DBuser, DBuserRelations, SQLExecutable } from "TiFBackendUtils"

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

export type UserAndRelationship = DBuser & UserRelationship

export const getUserAndRelationship = (
  conn: SQLExecutable,
  yourId: string,
  theirId: string
) =>
  conn
    .queryFirstResult<UserAndRelationship>(
      `
      SELECT
          u.*,
          COALESCE(uty.status, 'not-friends') AS fromThemToYou,
          COALESCE(ytu.status, 'not-friends') AS fromYouToThem
      FROM
          user u
          LEFT JOIN userRelations uty ON uty.fromUserId = :yourId AND uty.toUserId = u.id
          LEFT JOIN userRelations ytu ON ytu.fromUserId = u.id AND ytu.toUserId = :yourId
      WHERE u.id = :userId;
      `,
      { yourId, theirId }
    )
