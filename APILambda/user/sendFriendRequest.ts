import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { findTiFUser, UserRelationshipPair } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { chainMiddleware } from "TiFShared/lib/Middleware"
import { TiFAPIRouterExtension } from "../router"
import { isCurrentUser } from "../utils/isCurrentUserMiddleware"

const sendFriendRequestHandler = (({
  context: { selfId: fromUserId },
  params: { userId: toUserId }
}) =>
  conn
    .transaction((tx) =>
      findTiFUser(tx, { fromUserId, toUserId })
        .mapFailure((result) =>
          result === "no-results"
            ? resp(404, { userId: toUserId, error: "user-not-found" })
            : resp(403, { error: "blocked-you", userId: toUserId })
        )
        .mapSuccess(({ relationStatus }) => {
          if (
            relationStatus === "friends" ||
            relationStatus === "friend-request-sent"
          ) {
            return resp(200, { relationStatus })
          }

          return resp(201, {
            relationStatus:
              relationStatus === "friend-request-received"
                ? "friends"
                : "friend-request-sent"
          })
        })
        .observeSuccess(async ({ status, data: { relationStatus } }) => {
          if (status === 200) return

          if (relationStatus === "friends") {
            await insertFriendSQL(tx, { fromUserId, toUserId })
            return updateFriendsSQL(tx, { fromUserId, toUserId })
          } else if (relationStatus === "friend-request-sent") {
            return insertPendingFriendRequestSQL(tx, { fromUserId, toUserId })
          }
        })
    )
    .unwrap()) satisfies TiFAPIRouterExtension["sendFriendRequest"]

// NB: Middleware type inference issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendFriendRequest = chainMiddleware(
  isCurrentUser,
  sendFriendRequestHandler as any
) as unknown as typeof sendFriendRequestHandler

const insertFriendSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) =>
  conn.executeResult(
    `INSERT INTO userRelationships (fromUserId, toUserId, status)
    VALUES (:fromUserId, :toUserId, 'friends')
    ON DUPLICATE KEY UPDATE status = 'friends'`,
    { fromUserId, toUserId }
  )

const updateFriendsSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) =>
  conn.executeResult(
    `UPDATE userRelationships 
    SET status = 'friends' 
    WHERE (fromUserId = :fromUserId AND toUserId = :toUserId) OR (fromUserId = :toUserId AND toUserId = :fromUserId)
    `,
    { fromUserId, toUserId }
  )

const insertPendingFriendRequestSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) =>
  conn.executeResult(
    `INSERT INTO userRelationships (fromUserId, toUserId, status) 
    VALUES (:fromUserId, :toUserId, 'friend-request-pending')
    ON DUPLICATE KEY UPDATE
      status = 'friend-request-pending'
    `,
    { fromUserId, toUserId }
  )
