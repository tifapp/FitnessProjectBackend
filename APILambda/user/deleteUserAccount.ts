import { conn, userWithIdExists } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

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
      .mapSuccess(() => res.status(204).send())
      .mapFailure(() => res.status(400).send({ error: "user-does-not-exist" }))
  )

  return router
}
