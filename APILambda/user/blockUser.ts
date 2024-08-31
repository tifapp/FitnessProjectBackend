import { MySQLExecutableDriver, conn } from "TiFBackendUtils/MySQLDriver"
import { userWithIdExists } from "TiFBackendUtils/TiFUserUtils"
import { z } from "zod"
import { userNotFoundResponse } from "../shared/Responses"
import { ValidatedRouter } from "../validation"

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
  conn: MySQLExecutableDriver,
  fromUserId: string,
  toUserId: string
) => {
  return userWithIdExists(conn, toUserId)
    .withFailure("user-not-found" as const)
    .flatMapSuccess(() => {
      return conn.executeResult(
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
      return conn.executeResult(
        `
      DELETE FROM userRelations
      WHERE fromUserId = :toUserId AND toUserId = :fromUserId AND status != 'blocked';
      `,
        { fromUserId, toUserId }
      )
    })
}
