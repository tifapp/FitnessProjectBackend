import { conn } from "TiFBackendUtils"
import { DBevent } from "TiFBackendUtils/DBTypes"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../router"

const getEvent = (conn: MySQLExecutableDriver, eventId: number) =>
  conn.queryFirstResult<DBevent>(
    "SELECT * FROM event WHERE id = :eventId;",
    {
      eventId
    }
  )

const isHostUserNotFromOwnEvent = (
  conn: MySQLExecutableDriver,
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
  conn: MySQLExecutableDriver,
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
export const leaveEvent: TiFAPIRouterExtension["leaveEvent"] = ({ context: { selfId }, params: { eventId } }) =>
  conn.transaction((tx) =>
    getEvent(tx, eventId)
      .mapFailure(() => resp(404, { error: "event-not-found" }))
      .passthroughSuccess((event) =>
        (event.endedDateTime && event.endedDateTime <= event.startDateTime)
          ? failure(resp(403, { error: "event-has-been-cancelled" }))
          : success()
      )
      .passthroughSuccess((event) =>
        (event.endedDateTime)
          ? failure(resp(403, { error: "event-has-ended" }))
          : success()
      )
      .flatMapSuccess(() =>
        isHostUserNotFromOwnEvent(tx, selfId, eventId)
          .mapFailure((error) =>
            resp(400, { error })
          )
      )
      .flatMapSuccess(() =>
        removeUserFromAttendeeList(tx, selfId, eventId)
      )
      .mapSuccess(({ rowsAffected }) =>
        rowsAffected > 0 ? resp(204) : resp(400, { error: "already-left-event" })
      )
  )
    .unwrap()
