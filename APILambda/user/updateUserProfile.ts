import { DBuser, MySQLExecutableDriver, conn, userWithHandleDoesNotExist } from "TiFBackendUtils"
import { UpdateCurrentUserProfileRequest } from "TiFShared/api/models/User.js"
import { resp } from "TiFShared/api/Transport.js"
import { success } from "TiFShared/lib/Result.js"
import { TiFAPIRouter } from "../router.js"

export const updateCurrentUserProfile: TiFAPIRouter["updateCurrentUserProfile"] = async ({
  context: { selfId },
  body
}) =>
  conn
    .transaction((tx) => updateProfileTransaction(tx, selfId, body))
    .mapFailure((error) => resp(400, { error }) as never)
    .mapSuccess(() => resp(204))
    .unwrap()

const updateProfileTransaction = (
  conn: MySQLExecutableDriver,
  userId: string,
  updatedProfile: UpdateCurrentUserProfileRequest
) =>
  (updatedProfile ? userWithHandleDoesNotExist(conn, updatedProfile) : success())
    .flatMapSuccess(() => updateProfileSQL(conn, userId, updatedProfile))

const updateProfileSQL = (
  conn: MySQLExecutableDriver,
  userId: string,
  { handle, name, bio }: Partial<Pick<DBuser, "bio" | "handle" | "name">>
) =>
  conn
    .executeResult(
      `UPDATE user 
      SET 
      name = COALESCE(:name, name),
      bio = COALESCE(:bio, bio), 
      handle = COALESCE(:handle, handle)
      WHERE id = :userId`,
      { handle, name, bio, userId }
    )
