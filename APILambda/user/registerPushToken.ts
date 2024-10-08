import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { DevicePlatform } from "TiFShared/api/models/User"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../router"

export const registerForPushNotifications = (
  ({ body, context: { selfId: userId } }) =>
    tryInsertPushToken(conn, {
      ...body,
      userId
    })
      .mapSuccess((status) => resp(201, { status }))
      .mapFailure((error) => resp(400, { error }))
      .unwrap()
) satisfies TiFAPIRouterExtension["registerForPushNotifications"]

const tryInsertPushToken = (
  conn: MySQLExecutableDriver,
  insertRequest: {
    userId: string
    pushToken: string
    platformName: DevicePlatform
  }
) => {
  return conn
    .executeResult(
      `
      INSERT IGNORE INTO pushTokens (userId, pushToken, platformName) 
      VALUES (:userId, :pushToken, :platformName)
      `,
      insertRequest
    )
    .flatMapSuccess((result) => {
      return result.rowsAffected > 0
        ? success("inserted" as const)
        : failure("token-already-registered" as const)
    })
}
