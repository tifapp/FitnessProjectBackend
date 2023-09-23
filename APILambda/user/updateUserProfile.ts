import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { updateUserProfile } from "./SQL.js"

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
  router.patch("/self", {
    bodySchema: z.object({
      handle: z.string(),
      name: z.string(),
      bio: z.string()
    })
  }, async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      return await updateUserProfile(tx, {
        selfId: res.locals.selfId,
        ...req.body
      })
    })

    return res.status(200).json({ result })
  })

  return router
}

// Add a SQL statement that returns { status: "error", value: "duplicate-handle" } when the handle already exists

// Need to add checking logic when we update the user profile so that the handle isn't a duplicate

// Be aware of edge case where the user changes their handle but it is the same as the handle they had before
