import { conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env"
import { ValidatedRouter } from "../../validation"
import { queryUserSettings } from "./userSettingsQuery"

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
