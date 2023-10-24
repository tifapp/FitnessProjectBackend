import { SQLExecutable, success } from "TiFBackendUtils"
import {
  DatabaseUser,
  UserToProfileRelationStatus
} from "./models.js"

export type RegisterUserRequest = {
  id: string
  name: string
  handle: string
}

/**
 * Sends a friend request to the user represented by `receiverId`. If the 2 users have no
 * prior relationship, then a `friend-request-pending` status will be returned, otherwise
 * a `friends` status will be returned if the receiver has sent a friend request to the sender.
 *
 * @param conn the query executor to use
 * @param senderId the id of the user who is sending the friend request
 * @param receiverId the id of the user who is receiving the friend request
 */
export const sendFriendRequest = (
  conn: SQLExecutable,
  senderId: string,
  receiverId: string
) =>
  twoWayUserRelation(
    conn,
    senderId,
    receiverId
  ).flatMapSuccess(({ youToThemStatus, themToYouStatus }) => {
    if (
      youToThemStatus === "friends" ||
      youToThemStatus === "friend-request-pending"
    ) {
      return success({ statusChanged: false, status: youToThemStatus })
    }

    if (themToYouStatus === "friend-request-pending") {
      return makeFriends(conn, senderId, receiverId).withSuccess({ statusChanged: true, status: "friends" })
    }

    return addPendingFriendRequest(conn, senderId, receiverId).withSuccess({ statusChanged: true, status: "friend-request-pending" })
  })

const twoWayUserRelation = (
  conn: SQLExecutable,
  youId: string,
  themId: string
) => conn.queryResults<{
    fromUserId: string
    toUserId: string
    status: UserToProfileRelationStatus
  }>(
    `
    SELECT * FROM userRelations ur 
    WHERE 
      (ur.fromUserId = :youId AND ur.toUserId = :themId) 
      OR 
      (ur.fromUserId = :themId AND ur.toUserId = :youId) 
    `,
    { youId, themId }
  ).flatMapSuccess(results => success({
    youToThemStatus: results.find(
      (res) => res.fromUserId === youId && res.toUserId === themId
    )?.status,
    themToYouStatus: results.find(
      (res) => res.fromUserId === themId && res.toUserId === youId
    )?.status
  }))

const makeFriends = (
  conn: SQLExecutable,
  fromUserId: string,
  toUserId: string
) => conn.queryResults(
  `
    UPDATE userRelations 
    SET status = 'friends' 
    WHERE (fromUserId = :fromUserId AND toUserId = :toUserId) OR (fromUserId = :toUserId AND toUserId = :fromUserId)
  `,
  { fromUserId, toUserId }
)

const addPendingFriendRequest = (
  conn: SQLExecutable,
  senderId: string,
  receiverId: string
) => conn.queryResults(
  "INSERT INTO userRelations (fromUserId, toUserId, status) VALUES (:senderId, :receiverId, 'friend-request-pending')",
  { senderId, receiverId }
)

export const userWithHandleDoesNotExist = (conn: SQLExecutable, handle: string) =>
  conn
    .queryHasResults("SELECT TRUE FROM user WHERE handle = :handle", {
      handle
    })
    .inverted()
    .withFailure("duplicate-handle" as const)

export const userWithIdExists = (conn: SQLExecutable, id: string) => conn.queryHasResults("SELECT TRUE FROM user WHERE id = :id", { id })

/**
 * Queries the user with the given id.
 */
export const userWithId = (conn: SQLExecutable, userId: string) =>
  conn.queryFirstResult<DatabaseUser>(
    "SELECT * FROM user WHERE id = :userId",
    {
      userId
    }
  )
    .withFailure("user-not-found" as const)
