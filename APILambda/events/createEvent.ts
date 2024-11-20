import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { CreateEvent, EventID } from "TiFShared/domain-models/Event"
import { UserID } from "TiFShared/domain-models/User"
import { promiseResult, success } from "TiFShared/lib/Result"
import { Logger } from "TiFShared/logging"
import { authenticatedEndpoint } from "../auth"
import { ServerEnvironment } from "../env"
import { addUserToAttendeeList } from "../utils/eventAttendance"

export const createEventSQL = (
  conn: MySQLExecutableDriver,
  {
    coordinates: { latitude, longitude },
    dateRange: { startDateTime, endDateTime },
    ...rest
  }: CreateEvent,
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
      latitude,
      longitude,
      startDateTime,
      endDateTime,
      hostId
    }
  )
}

export const createEventTransaction = (
  conn: MySQLExecutableDriver,
  body: CreateEvent,
  selfId: UserID,
  environment: ServerEnvironment,
  log: Logger
) => {
  return conn
    .transaction((tx) =>
      createEventSQL(tx, body, selfId)
        .passthroughSuccess(({ insertId }) =>
          addUserToAttendeeList(conn, selfId, parseInt(insertId), "hosting")
        )
        .passthroughSuccess(() =>
          promiseResult(
            environment
              .callGeocodingLambda(body.coordinates)
              .then(() => success())
              .catch((e) => {
                log.error(e)
                return success()
              })
          )
        )
    )
    .mapSuccess(({ insertId }) => Number(insertId) as EventID)
}

// ALLOW EXTRA MIDDLEWARE
/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEvent = authenticatedEndpoint<"createEvent">(
  ({ environment, context: { selfId }, body, log }) =>
    createEventTransaction(conn, body, selfId, environment, log)
      .mapSuccess((id) => resp(201, { id }))
      .unwrap()
)
