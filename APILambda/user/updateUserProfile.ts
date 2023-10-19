import { UserHandle } from "TiFBackendUtils"
import { z } from "zod"
import { SQLExecutable, queryFirst } from "../dbconnection.js"
import { ServerEnvironment } from "../env.js"
import { Result } from "../utils.js"
import { ValidatedRouter } from "../validation.js"
import { userWithHandleExists } from "./SQL.js"
import { DatabaseUser } from "./models.js"

const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  bio: z.string().max(250).optional(),
  handle: UserHandle.schema
})

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>

/**
 * Updates the current user's profile with the given settings.
 *
 * @param conn the query executor to use
 * @param request the fields of the user's profile to update
 */
const updateUserProfile = async (
  conn: SQLExecutable,
  request: UpdateUserRequest & { selfId: string }
) => {
  await conn.execute(
    `
    UPDATE user 
    SET name = :name, bio = :bio, handle = :handle
    WHERE id = :selfId 
  `,
    { ...request, handle: request.handle.rawValue }
  )
}

/**
 * Queries the user with the given id.
 */
export const getProfileSettings = async (
  conn: SQLExecutable,
  userId: string
) => {
  return await queryFirst<Pick<DatabaseUser, "bio" | "handle" | "name">>(
    conn,
    `
    SELECT 
      name,
      handle,
      bio
    FROM user WHERE id = :userId`,
    {
      userId
    }
  )
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
  router.patch(
    "/self",
    { bodySchema: UpdateUserRequestSchema },
    async (req, res) => {
      const result = await environment.conn.transaction(
        async (
          tx
        ): Promise<Result<void, "user-not-found" | "duplicate-handle">> => {
          const currentUserResult = await getProfileSettings(
            tx,
            res.locals.selfId
          )

          if (!currentUserResult) {
            return { status: "error", value: "user-not-found" }
          }

          if (req.body.handle) {
            const userWithHandle = await userWithHandleExists(
              tx,
              req.body.handle.rawValue
            )

            if (userWithHandle) {
              return { status: "error", value: "duplicate-handle" }
            }
          }

          await updateUserProfile(tx, {
            ...currentUserResult,
            selfId: res.locals.selfId,
            ...req.body
          })

          return { status: "success", value: undefined }
        }
      )

      if (result.value === "user-not-found") {
        return res.status(401).json({ error: result.value })
      } else if (result.value === "duplicate-handle") {
        return res.status(401).json({ error: result.value })
      }

      return res.status(204).send("No Content") // TODO: Make util for No Content response
    }
  )

  return router
}
