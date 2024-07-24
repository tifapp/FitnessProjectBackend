import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { failure, success } from "TiFShared/lib/Result"
import { z } from "zod"
import { ServerEnvironment } from "../env"
import { ValidatedRouter } from "../validation"

const endEventParamsSchema = z.object({
  eventId: z.string()
})

const endEventByHost = (conn: MySQLExecutableDriver, hostId: string, eventId: number) =>
  conn
    .executeResult(
      `UPDATE event 
    SET endedDateTime = NOW()
    WHERE event.id = :eventId
        AND event.hostId = :hostId
        AND endedDateTime IS NULL;`,
      { eventId, hostId }
    )
    .flatMapSuccess((result) => {
      return result.rowsAffected > 0
        ? success()
        : failure("cannot-end-event" as const)
    })

/**
 * End or cancel an event given an event id.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const endEventRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * End an event
   */
  router.postWithValidation(
    "/end/:eventId",
    { pathParamsSchema: endEventParamsSchema },
    (req, res) =>
      conn.transaction((tx) =>
        endEventByHost(tx, res.locals.selfId, Number(req.params.eventId))
          .mapFailure((error) => {
            return res
              .status(error === "cannot-end-event" ? 403 : 500)
              .json({ error })
          })
          .mapSuccess(() => {
            return res.status(204).json()
          })
      )
  )
}
