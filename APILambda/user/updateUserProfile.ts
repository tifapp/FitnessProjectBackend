import { UserHandle, success, conn, SQLExecutable } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { DatabaseUser } from "./models.js"

const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  bio: z.string().max(250).optional(),
  handle: UserHandle.schema.optional()
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
  router.patch(
    "/self",
    { bodySchema: UpdateUserRequestSchema },
    async (req, res) => {
      return await conn
        .transactionResult((tx) => {
          return overwriteProfile(tx, res.locals.selfId, req.body)
        })
        .mapFailure((error) => res.status(401).json({ error }))
        .mapSuccess(() => res.status(204).send())
        .wait()
        .then()
    }
  )

  return router
}

const overwriteProfile = (
  conn: SQLExecutable,
  userId: string,
  request: UpdateUserRequest
) => {
  const handleCheck = request.handle
    ? checkForUserWithHandle(conn, request.handle)
    : success(undefined)
  return getProfileSettings(conn, userId).flatMapSuccess((settings) => {
    return handleCheck.flatMapSuccess(() => {
      const handle = request.handle?.rawValue ?? settings.handle
      const profile = { ...settings, ...request, handle }
      return updateUserProfile(conn, userId, profile)
    })
  })
}

const checkForUserWithHandle = (conn: SQLExecutable, handle: UserHandle) => {
  return conn
    .checkIfHasResults("SELECT TRUE FROM user WHERE handle = :handle", {
      handle: handle.rawValue
    })
    .inverted()
    .withFailure("duplicate-handle" as const)
}

type DatabaseUserProfile = {
  name: string
  handle: string
  bio?: string
}

const updateUserProfile = (
  conn: SQLExecutable,
  userId: string,
  profile: DatabaseUserProfile
) => {
  return conn.run(
    "UPDATE user SET name = :name, bio = :bio, handle = :handle WHERE id = :userId",
    { ...profile, userId }
  )
}

const getProfileSettings = (conn: SQLExecutable, userId: string) => {
  return conn
    .queryFirstResult<Pick<DatabaseUser, "bio" | "handle" | "name">>(
      "SELECT name, handle, bio FROM user WHERE id = :userId",
      { userId }
    )
    .withFailure("user-not-found" as const)
}
