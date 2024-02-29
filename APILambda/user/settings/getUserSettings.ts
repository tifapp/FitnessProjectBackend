import { conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { queryUserSettings } from "./userSettingsQuery.js"

export const getUserSettingsRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * gets the current user's settings info
   */
  router.getWithValidation("/self/settings", {}, (_, res) =>
    queryUserSettings(conn, res.locals.selfId)
      .mapSuccess(settings => res.status(200).json(settings).send())
  )
}
