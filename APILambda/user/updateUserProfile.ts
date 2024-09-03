import { conn } from "TiFBackendUtils"
import { DBuser } from "TiFBackendUtils/DBTypes"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { userWithHandleDoesNotExist } from "TiFBackendUtils/TiFUserUtils"
import { UserHandle } from "TiFShared/domain-models/User"
import { failure, success } from "TiFShared/lib/Result"
import type { NullablePartial } from "TiFShared/lib/Types/HelperTypes"
import { z } from "zod"
import { ServerEnvironment } from "../env"
import { ValidatedRouter } from "../validation"

const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  bio: z.string().max(250).optional(),
  //TODO: Find out why putting "userhandleschema" here throws an error when genapispecs script runs
  handle: z.string().optional()
})

type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>

type EditableProfileFields = Pick<DBuser, "bio" | "handle" | "name">

//TODO: Replace with userhandleschema
const parseHandle = (
  conn: MySQLExecutableDriver,
  handle?: string
) => {
  let parsedHandle: undefined | UserHandle;

  if (handle) {
    parsedHandle = UserHandle.optionalParse(handle)
    if (parsedHandle) {
      return userWithHandleDoesNotExist(conn, parsedHandle).withSuccess(parsedHandle)
    } else {
      return failure("invalid-request")
    }
  } else {
    return success()
  }
}

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const updateUserProfileRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * updates the current user's profile
   */
  router.patchWithValidation(
    "/self",
    { bodySchema: UpdateUserRequestSchema },
    (req, res) =>
      conn
        .transaction((tx) => updateProfileTransaction(tx, res.locals.selfId, req.body))
        .mapFailure((error) => res.status(400).json({ error }))
        .mapSuccess(() => res.status(204).send())
  )

  return router
}

const updateProfileTransaction = (
  conn: MySQLExecutableDriver,
  userId: string,
  { handle, name, bio }: UpdateUserRequest
) =>
  parseHandle(conn, handle).flatMapSuccess((parsedHandle) => updateProfile(conn, userId, { handle: parsedHandle, name, bio }))

const updateProfile = (
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
