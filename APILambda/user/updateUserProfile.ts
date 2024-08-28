import type { NullablePartial } from "TiFBackendUtils"
import { DBuser, MySQLExecutableDriver, UserHandleSchema, conn, success, userWithHandleDoesNotExist } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  bio: z.string().max(250).optional(),
  handle: UserHandleSchema.optional().transform(handle => handle?.rawValue)
})

type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>

type EditableProfileFields = Pick<DBuser, "bio" | "handle" | "name">

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
  updatedProfile: UpdateUserRequest
) =>
  (updatedProfile.handle ? userWithHandleDoesNotExist(conn, updatedProfile.handle) : success())
    .flatMapSuccess(() => updateProfile(conn, userId, updatedProfile))

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
