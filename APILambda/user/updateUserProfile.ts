import { Router } from "express"
import { ServerEnvironment } from "../env"
import { updateUserProfile } from "./SQL"

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const updateUserProfileRouter = (environment: ServerEnvironment, router: Router) => {
  /**
   * updates the current user's profile
   */
  router.patch("/self", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      const result = await updateUserProfile(tx, {
        selfId: res.locals.selfId,
        ...req.body
      })
      return res.status(200).json({ result })
    })
  })

  return router
}
