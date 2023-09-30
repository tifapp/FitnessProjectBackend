import { UserHandle } from "TiFBackendUtils"
import { z } from "zod"
import { SQLExecutable } from "../dbconnection.js"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { userWithId } from "./SQL.js"

const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional(), // check length limit
  handle: UserHandle.schema
})

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

/**
 * Updates the current user's profile with the given settings.
 *
 * @param conn the query executor to use
 * @param request the fields of the user's profile to update
 */
export const updateUserProfile = async (
  conn: SQLExecutable,
  request: UpdateUserRequest & {selfId: string}
) => {
  await conn.execute(
    `
    UPDATE user 
    SET name = :name, bio = :bio, handle = :handle
    WHERE id = :selfId 
  `,
    request
  )
}

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const updateUserProfileRouter = (environment: ServerEnvironment, router: ValidatedRouter) => {
  /**
   * updates the current user's profile
   */
  router.patch("/self", { bodySchema: UpdateUserRequestSchema }, async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      const currentUserResult = await userWithId(tx, res.locals.selfId)
      // if (currentUserResult.status === "error") {
      //   return currentUserResult
      // }
      // Add a SQL statement that returns { status: "error", value: "duplicate-handle" } when the handle already exists

      // Need to add checking logic when we update the user profile so that the handle isn't a duplicate

      // Be aware of edge case where the user changes their handle but it is the same as the handle they had before

      return await updateUserProfile(tx, {
        ...currentUserResult,
        selfId: res.locals.selfId,
        ...req.body
      })
    })

    return res.status(200).json({ result })
  })

  return router
}
