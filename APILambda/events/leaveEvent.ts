import { SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const joinEventSchema = z.object({
  eventId: z.string()
})

const leaveEvent = (conn: SQLExecutable, userId: string, eventId: number) => {
  return conn.transaction((tx) =>
    removeUserFromAttendeeList(tx, userId, eventId).flatMapSuccess(
      ({ rowsAffected }) => (rowsAffected > 0 ? success(204) : failure(400))
    )
  )
}

const removeUserFromAttendeeList = (
  conn: SQLExecutable,
  userId: string,
  eventId: number
) =>
  conn.queryResult(
    "DELETE FROM eventAttendance WHERE userId = :userId and eventId = :eventId",
    { userId, eventId }
  )

/**
 * Leave an event.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const leaveEventRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Join an event
   */
  router.postWithValidation(
    "/leave/:eventId",
    { pathParamsSchema: joinEventSchema },
    (req, res) =>
      leaveEvent(conn, res.locals.selfId, Number(req.params.eventId))
        .mapSuccess(() => res.status(204).json())
        .mapFailure(() =>
          res.status(400).json({ error: "no-event-found-or-have-not-joined" })
        )
  )
}
