import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { sendFriendRequest } from "./SQL.js"

const friendRequestSchema = z.object({
  userId: z.string()
})

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const sendFriendRequestsRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * sends a friend request to the specified userId
   */
  router.post(
    "/friend/:userId",
    { pathParamsSchema: friendRequestSchema },
    async (req, res) => {
      const result = await environment.conn.transaction(async (tx) => {
        return await sendFriendRequest(tx, res.locals.selfId, req.params.userId)
      })
      return res
        .status(result.statusChanged ? 201 : 200)
        .json({ status: result.status })
    }
  )
  return router
}
