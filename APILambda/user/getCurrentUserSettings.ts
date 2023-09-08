import express, { Response } from "express"
import { ServerEnvironment } from "../env.js"
import {
  userSettingsWithId
} from "./SQL.js"
import { DEFAULT_USER_SETTINGS } from "./models.js"

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
 * Sends a user not found response given a response and user id.
 *
 * @param res the response object to use
 * @param userId the id of the user who was not found.
 */
export const userNotFoundResponse = (res: Response, userId: string) => {
  res.status(404).json(userNotFoundBody(userId))
}

export const createUserRouter = (environment: ServerEnvironment) => {
  const router = express.Router()

  /**
   * gets the current user's settings info
   */
  router.get("/self/settings", async (_, res) => {
    const settings = await environment.conn.transaction(async (tx) => {
      return await userSettingsWithId(tx, res.locals.selfId)
    })
    if (settings.status === "error") {
      return userNotFoundResponse(res, res.locals.selfId)
    }
    return res.status(200).json(settings.value ?? DEFAULT_USER_SETTINGS)
  })

  return router
}
