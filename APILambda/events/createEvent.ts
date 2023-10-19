import { ServerEnvironment } from "../env.js"
import { CreateEventSchema, createEvent } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEventRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Create an event
   */
  router.post("/", { bodySchema: CreateEventSchema }, async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      return await createEvent(tx, res.locals.selfId, req.body)
    })
    if (result.status === "error") {
      return res.status(401).json(result.value)
    }
    return res.status(201).json(result.value)
  })
}
