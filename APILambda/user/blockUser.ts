import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { UserRelationsInput, userWithIdExists } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouter } from "../router"
import { userNotFoundBody } from "../utils/Responses"

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
