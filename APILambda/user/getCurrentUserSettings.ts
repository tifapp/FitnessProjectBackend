import { Router } from "express"
import { ServerEnvironment } from "../env.js"
import { userNotFoundResponse } from "../shared/Responses.js"
import {
  userSettingsWithId
} from "./SQL.js"
import { DEFAULT_USER_SETTINGS } from "./models.js"

export const getCurrentUserSettingsRouter = (environment: ServerEnvironment, router: Router) => {
  /**
   * gets the current user's settings info
   */
  router.get("/self/settings", async (_, res) => {
    const settings = await environment.conn.transaction(async (tx) => {
      return await userSettingsWithId(tx, res.locals.selfId)
    })
    if (settings.status === "error") {
      return userNotFoundResponse(res, res.locals.selfId)
    }
    return res.status(200).json(settings.value ?? DEFAULT_USER_SETTINGS)
  })
}
