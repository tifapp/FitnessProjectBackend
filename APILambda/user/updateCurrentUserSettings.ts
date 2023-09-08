import express from "express"
import { ServerEnvironment } from "../env.js"
import { withValidatedRequest } from "../validation"
import { overwriteUserSettings } from "./SQL"
import { userNotFoundResponse } from "./getUserInfo"
import { z } from "zod"
import { UserSettingsSchema } from "./models.js"

const PatchUserSettingsRequestSchema = z.object({
  body: UserSettingsSchema.partial()
})

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const createUserRouter = (environment: ServerEnvironment) => {
  const router = express.Router()

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
