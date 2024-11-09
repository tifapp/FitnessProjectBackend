import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { CreateEvent, EventID } from "TiFShared/domain-models/Event"
import { promiseResult, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../router"
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

// ALLOW EXTRA MIDDLEWARE
/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEvent = (({ environment, context: { selfId }, body, log }) =>
  conn
    .transaction((tx) =>
      createEventSQL(tx, body, selfId)
        .passthroughSuccess(({ insertId }) =>
          addUserToAttendeeList(tx, selfId, parseInt(insertId), "hosting")
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
        .mapSuccess(({ insertId }) =>
          resp(201, { id: Number(insertId) as EventID })
        )
    )
    .unwrap()) satisfies TiFAPIRouterExtension["createEvent"]
