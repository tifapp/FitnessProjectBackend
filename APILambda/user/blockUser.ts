import { MySQLExecutableDriver, UserRelationsInput, conn, userWithIdExists } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { TiFAPIRouter } from "../router.js"
import { userNotFoundBody } from "../utils/Responses.js"

export const blockUser: TiFAPIRouter["blockUser"] = ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) =>
  conn
    .transaction((tx) => blockUserSQL(tx, { fromUserId, toUserId }))
    .mapSuccess(() => resp(204))
    .mapFailure(() => resp(404, userNotFoundBody(toUserId)))
    .unwrap()

const blockUserSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationsInput
) => {
  return userWithIdExists(conn, toUserId)
    .flatMapSuccess(() => {
      return conn.executeResult(
        `
      INSERT INTO userRelations (fromUserId, toUserId, status)
      VALUES (:fromUserId, :toUserId, 'blocked')
      ON DUPLICATE KEY UPDATE
        status = 'blocked'
      `,
        { fromUserId, toUserId }
      )
    })
    .flatMapSuccess(() => {
      return conn.executeResult(
        `
      DELETE FROM userRelations
      WHERE fromUserId = :toUserId AND toUserId = :fromUserId AND status != 'blocked';
      `,
        { fromUserId, toUserId }
      )
    })
}
