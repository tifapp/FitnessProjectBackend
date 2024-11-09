import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import {
  UserRelationshipPair,
  userWithIdExists
} from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { authenticatedEndpoint } from "../router"
import { isCurrentUser } from "../utils/isCurrentUserMiddleware"

export const unblockUser = authenticatedEndpoint<"unblockUser">(
  ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) =>
    unblockUserSQL(conn, { fromUserId, toUserId })
      .flatMapSuccess((result) => {
        if (result.rowsAffected === 1) return success(resp(204))

        return userWithIdExists(conn, toUserId)
          .withFailure(
            resp(404, {
              error: "user-not-found",
              userId: toUserId
            })
          )
          .flatMapSuccess(() =>
            failure(
              resp(403, {
                error: "user-not-blocked",
                userId: toUserId
              })
            )
          )
      })
      .unwrap(),
  isCurrentUser
)

const unblockUserSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) =>
  conn.executeResult(
    `
      DELETE FROM userRelationships
      WHERE fromUserId = :fromUserId AND toUserId = :toUserId
        AND status = 'blocked'
    `,
    { fromUserId, toUserId }
  )
