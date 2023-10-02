import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { getEventWithId } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"

const eventRequestSchema = z
  .object({
    eventId: z.string()
  })

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getEventByIdRouter = (environment: ServerEnvironment, router: ValidatedRouter) => {
  router.get("/:eventId", { pathParamsSchema: eventRequestSchema }, async (req, res) => {
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
