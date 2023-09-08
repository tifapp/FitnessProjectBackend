import express from "express"
import { ServerEnvironment } from "../env.js"
import { getEventWithId } from "../shared/SQL.js"

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for event related operations.
 */
export const createEventRouter = (environment: ServerEnvironment) => {
  const router = express.Router()

  router.get("/:eventId", async (req, res) => {
    const result = await getEventWithId(environment.conn, Number(req.params.eventId))
    if (!result) {
      return res
        .status(404)
        .json({
          error: "event-not-found",
          eventId: parseInt(req.params.eventId)
        })
    }
    return res.status(200).json(result)
  })

  return router
}
