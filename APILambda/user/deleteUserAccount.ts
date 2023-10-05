import { ServerEnvironment } from "../env.js"
import { userNotFoundResponse } from "../shared/Responses.js"
import { ValidatedRouter } from "../validation.js"
import {
  userWithIdExists
} from "./SQL.js"

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const deleteUserAccountRouter = (environment: ServerEnvironment, router: ValidatedRouter) => {
  /**
   * deletes the current user's account
   */
  router.delete("/self", {}, async (_, res) => {
    if (await userWithIdExists(environment.conn, res.locals.selfId)) {
      return res.status(204).send("No Content")
    }
    return userNotFoundResponse(res, res.locals.selfId)
  })

  return router
}
