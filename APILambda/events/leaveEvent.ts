import { DBevent, SQLExecutable, conn, failure } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const leaveEventSchema = z.object({
  eventId: z.string()
})

// TODO: Handle adding co-host to event if main host decides to leave
const leaveEvent = (conn: SQLExecutable, userId: string, eventId: number) => {
  return conn.transaction((tx) =>
    getEvent(tx, eventId)
      .flatMapFailure(() => {
        return failure("event-not-found")
      })
      .flatMapSuccess((event) => {
        if (!event.endedDateTime) {
          return isHostUserNotFromOwnEvent(tx, userId, eventId)
            .flatMapSuccess(() =>
              removeUserFromAttendeeList(tx, userId, eventId)
            )
            .mapSuccess(({ rowsAffected }) =>
              rowsAffected > 0 ? "" : "already-left-event"
            )
            .mapFailure((error) => {
              return error
            })
        } else if (event.endedDateTime <= event.startDateTime) {
          return failure("event-has-been-cancelled" as const)
        } else {
          return failure("event-has-ended" as const)
        }
      })
  )
}

const getEvent = (conn: SQLExecutable, eventId: number) =>
  conn.queryFirstResult<DBevent>(
    "SELECT * FROM event WHERE id = :eventId;",
    {
      eventId
    }
  )

const isHostUserNotFromOwnEvent = (
  conn: SQLExecutable,
  userId: string,
  eventId: number
) =>
  conn
    .queryFirstResult(
      "SELECT hostId FROM event WHERE id = :eventId AND hostId = :userId",
      {
        userId,
        eventId
      }
    )
    .inverted()
    .withFailure("co-host-not-found" as const)

const removeUserFromAttendeeList = (
  conn: SQLExecutable,
  userId: string,
  eventId: number
) =>
  conn.executeResult(
    `DELETE ea FROM eventAttendance AS ea
    JOIN event AS e ON ea.eventId = e.id
    WHERE ea.userId = :userId AND ea.eventId = :eventId AND e.endedDateTime IS NULL`,
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
        .mapSuccess((result) =>
          res.status(!result ? 204 : 400).json({ error: result })
        )
        .mapFailure((error) =>
          res
            .status(
              error === "co-host-not-found"
                ? 400
                : error === "event-not-found"
                  ? 404
                  : 403
            )
            .json({ error })
        )
  )
}
