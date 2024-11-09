import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import {
  UserRelationshipPair,
  userWithIdExists
} from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api/Transport"
import { authenticatedEndpoint } from "../router"
import { isCurrentUser } from "../utils/isCurrentUserMiddleware"
import { userNotFoundBody } from "../utils/Responses"

export const blockUser = authenticatedEndpoint<"blockUser">(
  ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) =>
    conn
      .transaction((tx) => blockUserSQL(tx, { fromUserId, toUserId }))
      .mapSuccess(() => resp(204))
      .mapFailure(() => resp(404, userNotFoundBody(toUserId)))
      .unwrap(),
  isCurrentUser
)

const blockUserSQL = (
  conn: MySQLExecutableDriver,
  { fromUserId, toUserId }: UserRelationshipPair
) => {
  return userWithIdExists(conn, toUserId)
    .flatMapSuccess(() => {
      return conn.executeResult(
        `
      INSERT INTO userRelationships (fromUserId, toUserId, status)
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
      DELETE FROM userRelationships
      WHERE fromUserId = :toUserId AND toUserId = :fromUserId AND status != 'blocked';
      `,
        { fromUserId, toUserId }
      )
    })
}
