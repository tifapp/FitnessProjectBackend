import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api"
import { CreateEvent, EventEditLocation, EventID } from "TiFShared/domain-models/Event"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { UserID } from "TiFShared/domain-models/User"
import { AwaitableResult } from "TiFShared/lib/Result"
import { NamedLocation } from "TiFShared/lib/Types/NamedLocation"
import { authenticatedEndpoint } from "../auth"
import { addUserToAttendeeList } from "../utils/eventAttendance"

export const createEventSQL = (
  conn: MySQLExecutableDriver,
  {
    dateRange: { startDateTime, endDateTime },
    ...rest
  }: Omit<CreateEvent, "location"> & LocationCoordinate2D,
  hostId: string
) => {
  return conn.executeResult(
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
    :isChatEnabled,
    :latitude,
    :longitude
  )
  `,
    {
      ...rest,
      startDateTime,
      endDateTime,
      hostId
    }
  )
}

export const createEventTransaction = async (
  conn: MySQLExecutableDriver,
  body: CreateEvent,
  selfId: UserID,
  geocode: (locationEdit: EventEditLocation) => AwaitableResult<NamedLocation, never>
) => {
  const result = await geocode(body.location)

  return result.flatMapSuccess(({ coordinate }) =>
    conn
      .transaction((tx) =>
        createEventSQL(tx, { ...body, ...coordinate }, selfId)
          .passthroughSuccess(({ insertId }) =>
            addUserToAttendeeList(conn, selfId, parseInt(insertId), "hosting")
          )
      )
      .mapSuccess(({ insertId }) => Number(insertId) as EventID)
  )
}

// ALLOW EXTRA MIDDLEWARE
/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEvent = authenticatedEndpoint<"createEvent">(
  async ({ environment, context: { selfId }, body }) => {
    const result = await createEventTransaction(
      conn,
      body,
      selfId,
      (locationEdit) => environment.callGeocodingLambda(locationEdit)
    )

    return result.mapSuccess((id) => resp(201, { id }))
      .unwrap()
  }
)
