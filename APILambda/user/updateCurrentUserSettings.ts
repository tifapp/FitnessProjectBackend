import { ServerEnvironment } from "../env.js"
import { withValidatedRequest } from "../validation"
import { overwriteUserSettings } from "./SQL"
import { userNotFoundResponse } from "./getUserInfo"
import { z } from "zod"
import { UserSettingsSchema } from "./models.js"
import { Router } from "express"

const PatchUserSettingsRequestSchema = z.object({
  body: UserSettingsSchema.partial()
})

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const updateCurrentUserSettingsRouter = (environment: ServerEnvironment, router: Router) => {
  /**
   * updates the current user's settings
   */
  router.patch("/self/settings", async (req, res) => {
    await withValidatedRequest(
      req,
      res,
      PatchUserSettingsRequestSchema,
      async (data) => {
        const result = await environment.conn.transaction(async (tx) => {
          return await overwriteUserSettings(tx, res.locals.selfId, data.body)
        })
        if (result.status === "error") {
          return userNotFoundResponse(res, res.locals.selfId)
        }
        return res.status(204).send()
      }
    )
  })
}
