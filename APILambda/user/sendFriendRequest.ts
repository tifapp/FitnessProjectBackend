import { SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ValidatedRouter } from "../validation.js"
import { UserToProfileRelationStatus } from "./models.js"

const friendRequestSchema = z.object({
  userId: z.string().uuid()
})

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const sendFriendRequestsRouter = (router: ValidatedRouter) => {
  /**
   * sends a friend request to the specified userId
   */
  router.postWithValidation(
    "/friend/:userId",
    { pathParamsSchema: friendRequestSchema },
    (req, res) =>
      conn
        .transaction((tx) =>
          sendFriendRequest(tx, res.locals.selfId, req.params.userId)
        )
        .mapFailure((error) => res.status(403).json({ status: error }))
        .mapSuccess(({ status, statusChanged }) =>
          res
            .status(statusChanged ? 201 : 200)
            .json({ status })
            .send()
        )
  )
  return router
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
const sendFriendRequest = (
  conn: SQLExecutable,
  senderId: string,
  receiverId: string
) =>
  twoWayUserRelation(conn, senderId, receiverId).flatMapSuccess(
    ({ youToThemStatus, themToYouStatus }) => {
      if (
        youToThemStatus === "friends" ||
        youToThemStatus === "friend-request-pending"
      ) {
        return success({ statusChanged: false, status: youToThemStatus })
      }

      if (themToYouStatus === "blocked") {
        return failure("blocked" as const)
      }

      if (themToYouStatus === "friend-request-pending") {
        return makeFriends(conn, senderId, receiverId).withSuccess({
          statusChanged: true,
          status: "friends" as const
        })
      }

      return addPendingFriendRequest(conn, senderId, receiverId).withSuccess({
        statusChanged: true,
        status: "friend-request-pending" as const
      })
    }
  )

const twoWayUserRelation = (
  conn: SQLExecutable,
  youId: string,
  themId: string
) =>
  conn
    .queryResults<{
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
    )
    .flatMapSuccess((results) =>
      success({
        youToThemStatus: results.find(
          (res) => res.fromUserId === youId && res.toUserId === themId
        )?.status,
        themToYouStatus: results.find(
          (res) => res.fromUserId === themId && res.toUserId === youId
        )?.status
      })
    )

const makeFriends = (
  conn: SQLExecutable,
  fromUserId: string,
  toUserId: string
) =>
  conn.queryResults(
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
) =>
  conn.queryResults(
    `
    INSERT INTO userRelations (fromUserId, toUserId, status) 
    VALUES (:senderId, :receiverId, 'friend-request-pending')
    ON DUPLICATE KEY UPDATE
      status = 'friend-request-pending'
    `,
    { senderId, receiverId }
  )
