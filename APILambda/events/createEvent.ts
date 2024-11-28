import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import {
  addAttendanceData,
  getEventSQL,
  tifEventResponseFromDatabaseEvent
} from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api"
import {
  EventEdit,
  EventEditLocation
} from "TiFShared/domain-models/Event"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { UserID } from "TiFShared/domain-models/User"
import { PromiseResult } from "TiFShared/lib/Result"
import { NamedLocation } from "TiFShared/lib/Types/NamedLocation"
import { authenticatedEndpoint } from "../auth"
import { addUserToAttendeeList } from "../utils/eventAttendance"

export const createEventSQL = (
  conn: MySQLExecutableDriver,
  eventEdit: Omit<EventEdit, "location"> & LocationCoordinate2D,
  hostId: UserID
) => {
  return conn
    .executeResult(
      `
  INSERT INTO event (
    hostId,
    title,
    description,
    startDateTime,
    endDateTime,
    shouldHideAfterStartDate,
    isChatEnabled,
    latitude,
    longitude
  ) VALUES (
    :hostId,
    :title,
    :description,
    :startDateTime,
    :endDateTime,
    :shouldHideAfterStartDate,
    FALSE,
    :latitude,
    :longitude
  )
  `,
      {
        hostId,
        title: eventEdit.title,
        description: eventEdit.description,
        shouldHideAfterStartDate: eventEdit.shouldHideAfterStartDate,
        startDateTime: eventEdit.startDateTime,
        endDateTime: eventEdit.startDateTime.ext.addSeconds(eventEdit.duration),
        latitude: eventEdit.latitude,
        longitude: eventEdit.longitude
      }
    )
    .flatMapSuccess(({ insertId }) => {
      return getEventSQL(conn, parseInt(insertId), hostId)
    })
    .mapFailure((e) => e as never) // NB: Insert should always return the inserted value.
}

export const createEventTransaction = (
  conn: MySQLExecutableDriver,
  body: EventEdit,
  selfId: UserID,
  geocode: (
    locationEdit: EventEditLocation
  ) => PromiseResult<NamedLocation, never>
) => {
  return geocode(body.location).flatMapSuccess(({ coordinate }) => {
    return conn.transaction((tx) => {
      return createEventSQL(tx, { ...body, ...coordinate }, selfId)
        .passthroughSuccess((event) => {
          return addUserToAttendeeList(conn, selfId, event.id, "hosting")
        })
        .flatMapSuccess((event) => addAttendanceData(tx, [event], selfId))
        .mapSuccess(([event]) => tifEventResponseFromDatabaseEvent(event))
    })
  })
}

// ALLOW EXTRA MIDDLEWARE
/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEvent = authenticatedEndpoint<"createEvent">(
  async ({ environment, context: { selfId }, body }) => {
    return createEventTransaction(
      conn,
      body,
      selfId,
      (locationEdit) => environment.geocode(locationEdit)
    )
      .mapSuccess((event) => resp(201, event))
      .unwrap()
  }
)
