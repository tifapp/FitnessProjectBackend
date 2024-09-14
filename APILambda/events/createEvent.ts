import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api"
import { CreateEvent } from "TiFShared/api/models/Event"
import { EventID } from "TiFShared/domain-models/Event"
import { promiseResult, success } from "TiFShared/lib/Result"
import { TiFAPIRouter } from "../router"
import { addUserToAttendeeList } from "./joinEventById"

export const createEventSQL = (
  conn: MySQLExecutableDriver,
  {
    coordinates: {
      latitude,
      longitude
    },
    dateRange: {
      startDateTime,
      endDateTime
    },
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
    color, 
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
    :color, 
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
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      hostId
    }
  )
}

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEvent: TiFAPIRouter["createEvent"] = ({ environment, context: { selfId }, body }) =>
  conn
    .transaction((tx) =>
      createEventSQL(tx, body, selfId)
        .passthroughSuccess(({ insertId }) =>
          addUserToAttendeeList(
            tx,
            selfId,
            parseInt(insertId),
            "hosting"
          )
        )
        .passthroughSuccess(() =>
          promiseResult((async () => {
            try {
              console.log("hey going to call geocoding lambda")
              console.log(body)
              const resp = await environment.callGeocodingLambda(body.coordinates)
              console.debug(JSON.stringify(resp, null, 4))
            } catch (e) {
              console.error("Could not create placemark for ", body)
              console.error(e)
            }
            return success()
          })())
        )
        .mapSuccess(({ insertId }) => resp(201, { id: Number(insertId) as EventID }))
    )
    .unwrap()
