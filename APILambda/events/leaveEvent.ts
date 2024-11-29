import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { getEventSQL } from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { authenticatedEndpoint } from "../auth"
import { EventID } from "TiFShared/domain-models/Event"
import { UserID } from "TiFShared/domain-models/User"

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

const changeHostToEarliestAttendee = (
  conn: MySQLExecutableDriver,
  eventId: EventID
) => {
  return conn
    .queryFirstResult<{ userId: UserID }>(
      `
    SELECT ea.userId
    FROM eventAttendance AS ea
    WHERE ea.eventId = :eventId AND ea.role <> 'hosting'
    ORDER BY ea.joinedDateTime ASC
    LIMIT 1
    `,
      { eventId }
    )
    .passthroughSuccess(({ userId }) => {
      return conn.executeResult(
        "UPDATE event SET hostId = :userId WHERE id = :eventId",
        { userId, eventId }
      )
    })
    .passthroughSuccess(({ userId }) => {
      return conn.executeResult(
        "UPDATE eventAttendance SET role = 'hosting' WHERE eventId = :eventId AND userId = :userId",
        { userId, eventId }
      )
    })
}

const deleteEvent = (conn: MySQLExecutableDriver, eventId: EventID) => {
  return conn.executeResult("DELETE FROM event WHERE id = :eventId", {
    eventId
  })
}

/**
 * Leave an event given an event id.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const leaveEvent = authenticatedEndpoint<"leaveEvent">(
  ({ context: { selfId }, params: { eventId } }) =>
    conn
      .transaction((tx) =>
        getEventSQL(tx, eventId, selfId)
          .mapFailure((result) =>
            result.error === "event-not-found"
              ? resp(404, result)
              : (resp(403, result) as never)
          )
          .passthroughSuccess((event) =>
            event.endedDateTime
              ? failure(
                  resp(403, {
                    error:
                      event.startDateTime > event.endedDateTime
                        ? ("event-was-cancelled" as const)
                        : ("event-has-ended" as const)
                  })
                )
              : success()
          )
          .passthroughSuccess((event) => {
            if (event.hostId !== selfId) return success()
            return changeHostToEarliestAttendee(tx, eventId).flatMapFailure(
              () => deleteEvent(tx, eventId)
            )
          })
          .flatMapSuccess(() => removeUserFromAttendeeList(tx, selfId, eventId))
          .mapSuccess(({ rowsAffected }) =>
            rowsAffected > 0
              ? resp(204)
              : resp(200, { message: "not-attending" })
          )
      )
      .unwrap()
)
