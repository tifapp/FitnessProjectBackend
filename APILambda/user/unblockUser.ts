import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { UserRelationsInput, userWithIdExists } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../router"

export const unblockUser: TiFAPIRouterExtension["unblockUser"] =
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

const unblockUserSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationsInput
) => conn
  .executeResult(
    `
      DELETE FROM userRelations
      WHERE fromUserId = :fromUserId AND toUserId = :toUserId 
        AND status = 'blocked'
    `,
    { fromUserId, toUserId }
  )
