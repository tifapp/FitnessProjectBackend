import { ServerEnvironment } from "../env.js"
import { userNotFoundResponse } from "../shared/Responses.js"
import { ValidatedRouter } from "../validation.js"
import {
  userWithId
} from "./SQL.js"

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getUserInfoRouter = (environment: ServerEnvironment, router: ValidatedRouter) => {
  /**
   * gets the current user's account info
   */
  router.get("/self", {}, async (_, res) => {
    const user = await userWithId(environment.conn, res.locals.selfId)
    if (!user) {
      return userNotFoundResponse(res, res.locals.selfId)
    }
    return res.status(200).json(user)
  })
}
