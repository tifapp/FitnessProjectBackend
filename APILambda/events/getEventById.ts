import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseEvent } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"

const eventRequestSchema = z.object({
  eventId: z.string()
})

export const getEventById = (conn: SQLExecutable, eventId: number) => conn.queryFirstResult<DatabaseEvent>(
  "SELECT * FROM event WHERE id=:eventId",
  { eventId }
)
  .withFailure("event-not-found" as const)

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getEventByIdRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  router.getWithValidation(
    "/:eventId",
    { pathParamsSchema: eventRequestSchema },
    (req, res) => getEventById(
      conn,
      Number(req.params.eventId)
    )
      .mapFailure((error) => res.status(404).json({ error }))
      .mapSuccess(() => res.status(200).send())

  )
}
