import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { userWithHandleDoesNotExist } from "TiFBackendUtils/TiFUserUtils"
import { UpdateCurrentUserProfileRequest } from "TiFShared/api/models/User"
import { resp } from "TiFShared/api/Transport"
import { success } from "TiFShared/lib/Result"
import { authenticatedEndpoint } from "../auth"

export const updateCurrentUserProfile =
  authenticatedEndpoint<"updateCurrentUserProfile">(
    ({ context: { selfId }, body }) =>
      conn
        .transaction((tx) => updateProfileTransaction(tx, selfId, body))
        .mapFailure((error) => resp(400, { error }) as never)
        .mapSuccess(() => resp(204))
        .unwrap()
  )

const updateProfileTransaction = (
  conn: MySQLExecutableDriver,
  userId: string,
  updatedProfile: UpdateCurrentUserProfileRequest
) =>
  (updatedProfile.handle
    ? userWithHandleDoesNotExist(conn, updatedProfile.handle)
    : success()
  ).flatMapSuccess(() => updateProfileSQL(conn, userId, updatedProfile))

const updateProfileSQL = (
  conn: MySQLExecutableDriver,
  userId: string,
  { handle, name, bio }: Partial<Pick<DBuser, "bio" | "handle" | "name">>
) =>
  conn.executeResult(
    `UPDATE user
      SET
      name = COALESCE(:name, name),
      bio = COALESCE(:bio, bio),
      handle = COALESCE(:handle, handle)
      WHERE id = :userId`,
    { handle, name, bio, userId }
  )
