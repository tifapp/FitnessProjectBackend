import { DBuser, MySQLExecutableDriver, conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

/**
 * Queries the user with the given id.
 */
const getSelf = (conn: MySQLExecutableDriver, userId: string) =>
  conn
    .queryFirstResult<DBuser>("SELECT * FROM user WHERE id = :userId", {
      userId
    })
    .withFailure("user-not-found" as const)

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
    getSelf(conn, res.locals.selfId)
      .mapFailure((error) => res.status(500).json({ error }))
      .mapSuccess((user) => res.status(200).json(user))
  )
}
