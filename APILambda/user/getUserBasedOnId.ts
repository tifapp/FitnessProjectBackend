import express from "express"
import { ServerEnvironment } from "../env.js"
import { userWithId } from "./SQL.js"
import { userNotFoundResponse } from "./getCurrentUserSettings.js"

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
 * @returns a router for user related operations.
 */
export const createUserRouter = (environment: ServerEnvironment) => {
  const router = express.Router()

  /**
   * gets the user with the specified userId
   */
  router.get("/:userId", async (req, res) => {
    const user = await userWithId(environment.conn, req.params.userId)
    if (!user) {
      return userNotFoundResponse(res, req.params.userId)
    }
    return res.status(200).json({ ...user, relation: "not-friends" })
  })

  return router
}
