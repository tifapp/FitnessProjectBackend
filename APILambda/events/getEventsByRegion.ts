import { ServerEnvironment } from "../env.js"
import { getEvents } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getEventsByRegionRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Get events by region
   */
  router.get("/", {}, async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      return await getEvents(tx, {
        userId: res.locals.selfId,
        longitude: req.query.longitude as unknown as number,
        latitude: req.query.latitude as unknown as number,
        radiusMeters: req.query.radiusMeters as unknown as number
      })
    })

    return res.status(200).json({ result })
  })
}
