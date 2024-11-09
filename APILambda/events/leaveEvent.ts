import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { getEventSQL } from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../router"

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
export const leaveEvent = (({ context: { selfId }, params: { eventId } }) =>
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
        .passthroughSuccess((event) =>
          event.hostId === selfId
            ? failure(resp(400, { error: "co-host-not-found" }))
            : success()
        )
        .flatMapSuccess(() => removeUserFromAttendeeList(tx, selfId, eventId))
        .mapSuccess(({ rowsAffected }) =>
          rowsAffected > 0 ? resp(204) : resp(200, { message: "not-attending" })
        )
    )
    .unwrap()) satisfies TiFAPIRouterExtension["leaveEvent"]
