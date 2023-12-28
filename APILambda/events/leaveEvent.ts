import { SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const joinEventSchema = z.object({
  eventId: z.string()
})

// debug remove export
export const leaveEvent = (conn: SQLExecutable, userId: string, eventId: number) => {
  return conn.transaction((tx) =>
    removeUserToAttendeeList(tx, userId, eventId).flatMapSuccess(
      ({ rowsAffected }) => (rowsAffected > 0 ? success(204) : failure(404))
    )
  )
}

const removeUserToAttendeeList = (
  conn: SQLExecutable,
  userId: string,
  eventId: number
) =>
  conn.queryResult(
    "DELETE FROM eventAttendance WHERE userId = :userId and eventId = :eventId",
    { userId, eventId }
  )

/**
 * Join an event given an event id.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const joinEventRouter = (
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
        .mapSuccess(() => res.status(204).json("user-left-event"))
        .mapFailure((error) => res.status(500).json({ error }))
  )
}
