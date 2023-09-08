import express from "express"
import { ServerEnvironment } from "../env.js"
import {
  sendFriendRequest,
} from "./SQL.js"

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const createUserRouter = (environment: ServerEnvironment) => {
 const router = express.Router()

 /**
   * sends a friend request to the specified userId
   */
  router.post("/friend/:userId", async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      return await sendFriendRequest(tx, res.locals.selfId, req.params.userId)
    })
    return res
      .status(result.statusChanged ? 201 : 200)
      .json({ status: result.status })
  })
  return router
}