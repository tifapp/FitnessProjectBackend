import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { getEventSQL } from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { EventEdit } from "TiFShared/domain-models/Event"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { failure, success } from "TiFShared/lib/Result"
import dayjs from "dayjs"
import { TiFAPIRouterExtension } from "../router"

export const editEventSQL = (
  conn: MySQLExecutableDriver,
  {
    title,
    startDateTime,
    duration,
    shouldHideAfterStartDate,
    latitude,
    longitude,
    description
  }: Omit<EventEdit, "location"> & LocationCoordinate2D,
  eventId: number
) => {
  const endDateTime = dayjs(startDateTime).add(duration, 'second')
  return conn.executeResult(
    `
    UPDATE event
    SET 
      title = :title,
      startDateTime = :startDateTime,
      endDateTime = :endDateTime,
      description = :description,
      shouldHideAfterStartDate = :shouldHideAfterStartDate,
      latitude = :latitude,
      longitude = :longitude
    WHERE
      id = :eventId;
    `,
    {
      title,
      description,
      startDateTime,
      endDateTime,
      shouldHideAfterStartDate,
      latitude,
      longitude,
      eventId
    }
  )
}

// ALLOW EXTRA MIDDLEWARE
/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const editEvent = (
  ({ context: { selfId }, body, params }) =>
    conn
      .transaction((tx) =>
        getEventSQL(conn, Number(params.eventId), selfId)
              .mapFailure(result => result.error === "event-not-found" ? resp(404, result) : resp(403, result))
              .flatMapSuccess((event) => 
                selfId === event.hostId ? success() : failure(resp(403, { error: "user-not-host" })))
                .passthroughSuccess(() =>
                  editEventSQL(tx, {...body, body.value.location.latitude, body.value.location.longitude }, params.eventId)
                )
            )
      .unwrap()
  ) satisfies TiFAPIRouterExtension["editEvent"]
