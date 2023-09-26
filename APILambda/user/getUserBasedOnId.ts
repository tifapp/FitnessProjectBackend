import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { userNotFoundResponse } from "../shared/Responses.js"
import { ValidatedRouter } from "../validation.js"
import { userWithId } from "./SQL.js"

const friendRequestSchema = z
  .object({
    userId: z.string()
  })

/**
 * Returns an object that indicates that can be used as the response
 * body when a user is not found.
 *
 * @param userId the id of the user who was not found.
 */
export const userNotFoundBody = (userId: string) => ({
  userId,
  error: "user-not-found"
})

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getUserBasedOnIdRouter = (environment: ServerEnvironment, router: ValidatedRouter) => {
  /**
   * gets the user with the specified userId
   */
  router.get("/", { querySchema: friendRequestSchema }, async (req, res) => {
    const user = await userWithId(environment.conn, req.query.userId as string)
    if (!user) {
      return userNotFoundResponse(res, req.query.userId as string)
    }
    return res.status(200).json({ ...user, relation: "not-friends" })
  })
}
