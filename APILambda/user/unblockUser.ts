import { SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ValidatedRouter } from "../validation.js"
import { userWithIdExists } from "./UserExistsChecks.js"

const UnblockUserRequestSchema = z.object({
  userId: z.string().uuid()
})

/**
 * Creates an endpoint to unblock the user.
 */
export const createUnblockUserRouter = (router: ValidatedRouter) => {
  router.deleteWithValidation("/block/:userId",
    { pathParamsSchema: UnblockUserRequestSchema },
    async (req, res) => {
      return unblockUser(conn, res.locals.selfId, req.params.userId)
        .mapFailure((error) => {
          return res
            .status(error === "user-not-found" ? 404 : 403)
            .json({ error, userId: req.params.userId })
        })
        .mapSuccess(() => res.status(204).send())
    })
}

const unblockUser = (
  conn: SQLExecutable,
  fromUserId: string,
  toUserId: string
) => {
  return conn
    .queryResult(
      `
        DELETE FROM userRelations
        WHERE fromUserId = :fromUserId AND toUserId = :toUserId 
          AND status = 'blocked'
      `,
      { fromUserId, toUserId }
    )
    .flatMapSuccess((result) => {
      if (result.rowsAffected === 1) return success()
      return userWithIdExists(conn, toUserId)
        .withFailure("user-not-found" as const)
        .flatMapSuccess(() => failure("user-not-blocked" as const))
    })
}
