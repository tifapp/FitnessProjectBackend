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
