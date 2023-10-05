import { ServerEnvironment } from "../env.js"
import { userNotFoundResponse } from "../shared/Responses.js"
import { ValidatedRouter } from "../validation.js"
import { overwriteUserSettings } from "./SQL.js"
import { UserSettingsSchema } from "./models.js"

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const updateCurrentUserSettingsRouter = (environment: ServerEnvironment, router: ValidatedRouter) => {
  /**
   * updates the current user's settings
   */
  router.patch("/self/settings", { bodySchema: UserSettingsSchema.partial() }, async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      return await overwriteUserSettings(tx, res.locals.selfId, req.body)
    })
    if (result.status === "error") {
      return userNotFoundResponse(res, res.locals.selfId)
    }
    return res.status(204).send("No Content")
  })
}
