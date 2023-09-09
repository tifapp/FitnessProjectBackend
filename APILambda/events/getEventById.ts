import { ServerEnvironment } from "../env.js"
import { getEventWithId } from "../shared/SQL.js"
import { Router } from "express"

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEventByIdRouter = (environment: ServerEnvironment, router: Router) => {
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
}
