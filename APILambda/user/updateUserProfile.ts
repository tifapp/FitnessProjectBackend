import { DBuser, MySQLExecutableDriver, conn, userWithHandleDoesNotExist } from "TiFBackendUtils"
import { UpdateCurrentUserProfileRequest } from "TiFShared/api/models/User.js"
import { success } from "TiFShared/lib/Result.js"
import { NullablePartial } from "TiFShared/lib/Types/HelperTypes.js"
import { TiFAPIRouter } from "../router.js"

export const updateCurrentUserProfile: TiFAPIRouter["updateCurrentUserProfile"] = async ({
  context: { selfId },
  body
}) =>
  conn
    .transaction((tx) => updateProfileTransaction(tx, selfId, body))
    .mapFailure((error) => ({ status: 400, data: error }) as any)
    .mapSuccess(() => ({ status: 204 }))
    .unwrap()

const updateProfileTransaction = (
  conn: MySQLExecutableDriver,
  userId: string,
  updatedProfile: UpdateCurrentUserProfileRequest
) =>
  (updatedProfile.handle ? userWithHandleDoesNotExist(conn, updatedProfile.handle) : success())
    .flatMapSuccess(() => updateProfileSQL(conn, userId, updatedProfile))

type EditableProfileFields = Pick<DBuser, "bio" | "handle" | "name">

const updateProfileSQL = (
  conn: MySQLExecutableDriver,
  userId: string,
  { handle = null, name = null, bio = null }: NullablePartial<EditableProfileFields>
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
