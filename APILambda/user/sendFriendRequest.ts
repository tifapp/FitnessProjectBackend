import { conn } from "TiFBackendUtils"
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
  router.postWithValidation(
    "/friend/:userId",
    { pathParamsSchema: friendRequestSchema },
    (req, res) => conn.transaction((tx) => sendFriendRequest(tx, res.locals.selfId, req.params.userId))
      .mapFailure((error) => res.status(500).json({ error }))
      .mapSuccess(({ status, statusChanged }) => res.status(statusChanged ? 201 : 200).json({ status }).send())
  )
  return router
}
