import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { findTiFUser, UserRelationsInput } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouter } from "../router"

export const sendFriendRequest: TiFAPIRouter["sendFriendRequest"] = async ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) => {
  if (fromUserId === toUserId) { // make generic? getuser, blockuser, unblockuser, etc
    return resp(400, { error: "cannot-friend-self" }) as never
  }

  const result = await findTiFUser(conn, { fromUserId, toUserId })
    .withFailure(resp(404, {
      userId: toUserId,
      error: "user-not-found"
    }))
    .mapSuccess(
      ({ relations: { fromYouToThem, fromThemToYou } }) => {
        if (fromThemToYou === "blocked") {
          return resp(403, { error: "blocked", userId: toUserId })
        }

        if (
          fromYouToThem === "friends" ||
          fromYouToThem === "friend-request-pending"
        ) {
          return resp(200, { status: fromYouToThem })
        }

        if (fromThemToYou === "friend-request-pending") {
          return "friends" as const
        }

        return "friend-request-pending" as const
      }
    )
    .unwrap()

  if (result === "friend-request-pending") {
    return addPendingFriendRequestSQL(conn, { fromUserId, toUserId })
      .withSuccess(resp(201,
        { status: "friend-request-pending" }
      ))
      .unwrap()
  }

  if (result === "friends") {
    return makeFriendsSQL(conn, { fromUserId, toUserId })
      .withSuccess(resp(201,
        { status: "friends" }
      ))
      .unwrap()
  }

  return result
}

const makeFriendsSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationsInput
) =>
  conn.executeResult(
    `
    UPDATE userRelations 
    SET status = 'friends' 
    WHERE (fromUserId = :fromUserId AND toUserId = :toUserId) OR (fromUserId = :toUserId AND toUserId = :fromUserId)
  `,
    { fromUserId, toUserId }
  )

const addPendingFriendRequestSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationsInput
) =>
  conn.executeResult(
    `
    INSERT INTO userRelations (fromUserId, toUserId, status) 
    VALUES (:fromUserId, :toUserId, 'friend-request-pending')
    ON DUPLICATE KEY UPDATE
      status = 'friend-request-pending'
    `,
    { fromUserId, toUserId }
  )
