import { MySQLExecutableDriver, conn, findTiFUser } from "TiFBackendUtils"
import { failure, success } from "TiFShared/lib/Result"
import { z } from "zod"
import { ValidatedRouter } from "../validation"

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
  conn: MySQLExecutableDriver,
  senderId: string,
  receiverId: string
) =>
  findTiFUser(conn, senderId, receiverId).flatMapSuccess(
    ({ relations: { fromYouToThem, fromThemToYou } }) => {
      if (
        fromYouToThem === "friends" ||
        fromYouToThem === "friend-request-pending"
      ) {
        return success({ statusChanged: false, status: fromYouToThem })
      }

      if (fromThemToYou === "blocked") {
        return failure("blocked" as const)
      }

      if (fromThemToYou === "friend-request-pending") {
        return makeFriends(conn, senderId, receiverId).withSuccess({ // could be combined all into one, something like "upsert where fromUser=xxx, toUser=yyy and relation is friend-request pending"
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

const makeFriends = (
  conn: MySQLExecutableDriver,
  fromUserId: string,
  toUserId: string
) =>
  conn.executeResult(
    `
    UPDATE userRelations 
    SET status = 'friends' 
    WHERE (fromUserId = :fromUserId AND toUserId = :toUserId) OR (fromUserId = :toUserId AND toUserId = :fromUserId)
  `,
    { fromUserId, toUserId }
  )

const addPendingFriendRequest = (
  conn: MySQLExecutableDriver,
  senderId: string,
  receiverId: string
) =>
  conn.executeResult(
    `
    INSERT INTO userRelations (fromUserId, toUserId, status) 
    VALUES (:senderId, :receiverId, 'friend-request-pending')
    ON DUPLICATE KEY UPDATE
      status = 'friend-request-pending'
    `,
    { senderId, receiverId }
  )
