import { conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { userNotFoundResponse } from "../shared/Responses.js"
import { ValidatedRouter } from "../validation.js"
import { userWithIdExists } from "./SQL.js"

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const deleteUserAccountRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * deletes the current user's account
   */
  router.deleteWithValidation("/self", {}, (_, res) =>
    userWithIdExists(conn, res.locals.selfId)
      .mapSuccess(() => res.status(204).send("No Content"))
      .mapFailure(() => userNotFoundResponse(res, res.locals.selfId))
  )

  return router
}
