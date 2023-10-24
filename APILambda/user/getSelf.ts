import { conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { userWithId } from "./SQL.js"

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getSelfRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * gets the current user's account info
   */
  router.getWithValidation("/self", {}, (_, res) =>
    userWithId(conn, res.locals.selfId)
      .mapFailure((error) => res.status(400).json({ error }))
      .mapSuccess((user) => res.status(200).json(user))
  )
}
