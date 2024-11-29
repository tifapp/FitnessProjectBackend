import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { addAttendanceData, DBTifEvent, getEventSQL, tifEventResponseFromDatabaseEvent } from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { EventEdit, EventEditLocation, EventID } from "TiFShared/domain-models/Event"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { UserID } from "TiFShared/domain-models/User"
import { failure, PromiseResult, success } from "TiFShared/lib/Result"
import { NamedLocation } from "TiFShared/lib/Types/NamedLocation"
import { authenticatedEndpoint } from "../auth"

type DBEventEdit = DBTifEvent & Omit<EventEdit, "location"> & LocationCoordinate2D

const editEventSQL = (
  conn: MySQLExecutableDriver,
  {
    title,
    startDateTime,
    endDateTime,
    shouldHideAfterStartDate,
    latitude,
    longitude,
    description
  }: DBEventEdit,
  eventId: EventID
) => {
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

export const dbEditedEventTimes = (
  body: Partial<Pick<EventEdit, "startDateTime" | "duration">>,
  event: Pick<DBTifEvent, "startDateTime" | "endDateTime">
) => {
  const startDateTime = body.startDateTime ?? event.startDateTime
  const duration = body.duration ?? event.endDateTime.ext.diff(event.startDateTime).seconds
  const endDateTime = startDateTime.ext.addSeconds(duration)

  return { startDateTime, endDateTime }
}

export const editEventTransaction = (
  conn: MySQLExecutableDriver,
  body: EventEdit,
  selfId: UserID,
  eventId: EventID,
  geocode: (
    locationEdit: EventEditLocation
  ) => PromiseResult<NamedLocation, never>
) => {
  return (body.location ? (geocode(body.location)) : success())
    .flatMapSuccess((location) => {
      return conn.transaction((tx) => {
        return getEventSQL(conn, eventId, selfId)
          .flatMapSuccess((event) =>
            selfId === event.hostId ? success(event) : failure({ error: "user-not-host" } as const)
          )
          .passthroughSuccess((event) =>
            event.endedDateTime
              ? failure({ error: "event-has-ended" } as const)
              : success()
          )
          .flatMapSuccess((event) => {
            const { startDateTime, endDateTime } = dbEditedEventTimes(body, event)
            const updatedEvent: DBEventEdit = { ...event, ...location?.coordinate, ...body, startDateTime, endDateTime }

            return editEventSQL(tx, updatedEvent, eventId)
              .flatMapSuccess(() => addAttendanceData(tx, [updatedEvent], selfId))
              .mapSuccess(([event]) => tifEventResponseFromDatabaseEvent(event))
          })
      })
    })
}

export const editEvent = authenticatedEndpoint<"editEvent">(
  async ({ context: { selfId }, body, params, environment }) => {
    return editEventTransaction(conn, body, selfId, Number(params.eventId), environment.geocode)
      .mapSuccess((event) => resp(200, event))
      .mapFailure(result => result.error === "event-not-found" ? resp(404, result) : resp(403, result))
      .unwrap()
  }
)
