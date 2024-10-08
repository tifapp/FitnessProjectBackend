import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { UserRelationshipPair, userWithIdExists } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { chainMiddleware } from "TiFShared/lib/Middleware"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../router"
import { isCurrentUser } from "../utils/isCurrentUserMiddleware"

const unblockUserHandler = (
  ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) =>
    unblockUserSQL(conn, { fromUserId, toUserId })
      .flatMapSuccess((result) => {
        if (result.rowsAffected === 1) return success(resp(204))

        return userWithIdExists(conn, toUserId)
          .withFailure(resp(404,
            {
              error: "user-not-found",
              userId: toUserId
            }
          ))
          .flatMapSuccess(() =>
            failure(resp(403,
              {
                error: "user-not-blocked",
                userId: toUserId
              }
            ))
          )
      })
      .unwrap()
    ) satisfies TiFAPIRouterExtension["unblockUser"]

// NB: Middleware type inference issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const unblockUser = chainMiddleware(isCurrentUser, unblockUserHandler as any) as unknown as typeof unblockUserHandler

const unblockUserSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) => conn
  .executeResult(
    `
      DELETE FROM userRelationships
      WHERE fromUserId = :fromUserId AND toUserId = :toUserId 
        AND status = 'blocked'
    `,
    { fromUserId, toUserId }
  )
