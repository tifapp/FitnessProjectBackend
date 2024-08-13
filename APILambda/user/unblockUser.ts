import { MySQLExecutableDriver, UserRelationsInput, conn, userWithIdExists } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { failure, success } from "TiFShared/lib/Result.js"
import { TiFAPIRouter } from "../router.js"

export const unblockUser: TiFAPIRouter["unblockUser"] =
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
