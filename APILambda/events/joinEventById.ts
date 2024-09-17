import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { areCoordinatesEqual } from "TiFShared/domain-models/LocationCoordinate2D"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouter } from "../router"
import { isUserBlocked } from "../utils/sharedSQL"
import { upcomingEventArrivalRegionsSQL } from "./arrivals/getUpcomingEvents"
import { insertArrival } from "./arrivals/setArrivalStatus"
import { getTokenRequest } from "./getChatToken"
import { eventDetailsSQL } from "./getEventById"

export const joinEvent: TiFAPIRouter["joinEvent"] = async ({ context: { selfId }, params: { eventId }, body: { region: { coordinate } = { coordinate: undefined } } = {} }) =>
  conn.transaction((tx) =>
    eventDetailsSQL(tx, eventId, selfId)
      .withFailure(resp(404, { error: "event-not-found" }))
      .passthroughSuccess(event =>
        event.endedDateTime
          ? failure(resp(403, { error: "event-has-ended" }))
          : success()
      )
      .passthroughSuccess(event =>
        isUserBlocked(tx, event.hostId, selfId)
          .inverted()
          .withFailure(resp(403, { error: "user-is-blocked" }))
      )
      .mapSuccess(async (event) => {
        const [status, hasArrived = false, chatPermissions, trackableRegions] = await Promise.all([
          addUserToAttendeeList(tx, selfId, eventId, "attending")
            .mapSuccess(
              ({ rowsAffected }) =>
                rowsAffected > 0 ? (201) : (200)
            ).unwrap(),
          (coordinate && areCoordinatesEqual(coordinate, event))
            ? insertArrival(tx, selfId, coordinate).withSuccess(true).unwrap()
            : success().unwrap(),
          getTokenRequest(event, selfId),
          upcomingEventArrivalRegionsSQL(tx, selfId).unwrap()
        ])

        console.log("join event response is")
        console.log({ ...chatPermissions, hasArrived, trackableRegions })

        if (status === 201) {
          return resp(201, { ...chatPermissions, hasArrived, trackableRegions })
        } else {
          return resp(200, { ...chatPermissions, hasArrived, trackableRegions })
        }
      })
  )
    .unwrap()

// ADD CHECK IF HOST TRIES JOINING THEIR OWN EVENT
// AUTO MAKE HOST AN ATTENDEE
export const addUserToAttendeeList = (
  conn: MySQLExecutableDriver,
  userId: string,
  eventId: number,
  role: string
) =>
  conn.executeResult(
    "INSERT IGNORE INTO eventAttendance (userId, eventId, role) VALUES (:userId, :eventId, :role)",
    { userId, eventId, role }
  )
