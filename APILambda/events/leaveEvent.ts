import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const leaveEventSchema = z.object({
  eventId: z.string()
})

// TODO: Handle adding co-host to event if main host decides to leave
const leaveEvent = (conn: SQLExecutable, userId: string, eventId: number) => {
  return conn.transaction((tx) =>
    isHostUserFromOwnEvent(tx, userId, eventId)
      .inverted()
      .flatMapSuccess(() => removeUserFromAttendeeList(tx, userId, eventId))
      .mapSuccess(({ rowsAffected }) => (rowsAffected > 0 ? 204 : 200))
      .mapFailure(() => 400)
  )
}

const isHostUserFromOwnEvent = (
  conn: SQLExecutable,
  userId: string,
  eventId: number
) =>
  conn.queryFirstResult(
    "SELECT hostId FROM event WHERE id = :eventId AND hostId = :userId",
    {
      userId,
      eventId
    }
  )

const removeUserFromAttendeeList = (
  conn: SQLExecutable,
  userId: string,
  eventId: number
) =>
  conn.queryResult(
    `DELETE FROM eventAttendance 
    WHERE userId = :userId and eventId = :eventId`,
    { userId, eventId }
  )

/**
 * Leave an event given an event id.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const leaveEventRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Leave an event
   */
  router.deleteWithValidation(
    "/leave/:eventId",
    { pathParamsSchema: leaveEventSchema },
    (req, res) =>
      leaveEvent(conn, res.locals.selfId, Number(req.params.eventId))
        .mapSuccess((result) => res.status(result).json())
        .mapFailure((error) =>
          res.status(error).json({ error: "co-host-not-found" })
        )
  )
}
