import express, { Response } from "express"
import { ServerEnvironment } from "../env.js"
import {
  userWithId
} from "./SQL.js"

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

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const createUserRouter = (environment: ServerEnvironment) => {
 const router = express.Router()

 /**
   * gets the current user's account info
   */
  router.get("/self", async (_, res) => {
    const user = await userWithId(environment.conn, res.locals.selfId)
    if (!user) {
      return userNotFoundResponse(res, res.locals.selfId)
    }
    return res.status(200).json(user)
  })

  return router
}
    
  