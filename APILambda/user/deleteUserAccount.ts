import { Router } from "express"
import { ServerEnvironment } from "../env.js"
import { userNotFoundResponse } from "../shared/Responses.js"
import {
  userWithIdExists
} from "./SQL.js"

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const deleteUserAccountRouter = (environment: ServerEnvironment, router: Router) => {
  /**
   * deletes the current user's account
   */
  router.delete("/self", async (_, res) => {
    if (await userWithIdExists(environment.conn, res.locals.selfId)) {
      return res.status(204).send()
    }
    return userNotFoundResponse(res, res.locals.selfId)
  })

  return router
}
