import { SQLExecutable, UserHandle, conn, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { userWithHandleDoesNotExist } from "./SQL.js"
import { DatabaseUser } from "./models.js"

const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  bio: z.string().max(250).optional(),
  handle: UserHandle.schema.optional().transform(userHandle => userHandle?.rawValue)
})

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>

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
        .transaction((tx) => updateProfile(tx, res.locals.selfId, req.body))
        .mapFailure((error) => res.status(400).json({ error }))
        .mapSuccess(() => res.status(204).send())
  )

  return router
}

const updateProfile = (
  conn: SQLExecutable,
  userId: string,
  request: UpdateUserRequest
) =>
  (request.handle ? userWithHandleDoesNotExist(conn, request.handle) : success())
    .flatMapSuccess(() => getProfile(conn, userId))
    .flatMapSuccess((profile) => {
      const handle = request.handle ?? profile.handle
      const name = request.name ?? profile.name
      const updatedProfile = { ...profile, ...request, handle, name }
      return overwriteProfile(conn, userId, updatedProfile)
    })

type DatabaseUserProfile = {
  name: string
  handle: string
  bio?: string
}

const overwriteProfile = (
  conn: SQLExecutable,
  userId: string,
  profile: DatabaseUserProfile
) =>
  conn
    .queryResults(
      "UPDATE user SET name = :name, bio = :bio, handle = :handle WHERE id = :userId",
      { ...profile, userId }
    )

const getProfile = (conn: SQLExecutable, userId: string) =>
  conn
    .queryFirstResult<Pick<DatabaseUser, "bio" | "handle" | "name">>(
      "SELECT name, handle, bio FROM user WHERE id = :userId",
      { userId }
    )
    .withFailure("user-not-found" as const)
