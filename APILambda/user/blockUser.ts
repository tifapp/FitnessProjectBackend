import { SQLExecutable, conn } from "TiFBackendUtils"
import { userNotFoundResponse } from "../shared/Responses.js"
import { ValidatedRouter } from "../validation.js"
import { userWithIdExists } from "./SQL.js"
import { z } from "zod"

const BlockUserRequestSchema = z.object({
  userId: z.string().uuid()
})

export const createBlockUserRouter = (router: ValidatedRouter) => {
  router.patchWithValidation(
    "/block/:userId",
    { pathParamsSchema: BlockUserRequestSchema },
    async (req, res) => {
      return conn
        .transaction((tx) => {
          return blockUser(tx, res.locals.selfId, req.params.userId)
        })
        .mapSuccess(() => res.status(204).send())
        .mapFailure(() => userNotFoundResponse(res, req.params.userId))
    }
  )
}

const blockUser = (
  conn: SQLExecutable,
  fromUserId: string,
  toUserId: string
) => {
  return userWithIdExists(conn, toUserId)
    .withFailure("user-not-found" as const)
    .flatMapSuccess(() => {
      return conn.queryResults(
        `
      INSERT INTO userRelations (fromUserId, toUserId, status)
      VALUES (:fromUserId, :toUserId, 'blocked')
      ON DUPLICATE KEY UPDATE
        status = 'blocked'
      `,
        { fromUserId, toUserId }
      )
    })
    .flatMapSuccess(() => {
      return conn.queryResults(
        `
      DELETE userRelations
      WHERE fromUserId = :toUserId AND toUserId = :fromUserId AND status != 'blocked';
      `,
        { fromUserId, toUserId }
      )
    })
}
