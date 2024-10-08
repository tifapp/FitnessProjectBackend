import { conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport"
import { areCoordinatesEqual } from "TiFShared/domain-models/LocationCoordinate2D"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../router"
import { addUserToAttendeeList } from "../utils/eventAttendance"
import { getEventSQL } from "../utils/eventDetails"
import { upcomingEventArrivalRegionsSQL } from "./arrivals/getUpcomingEvents"
import { insertArrival } from "./arrivals/setArrivalStatus"

export const joinEvent = (
  async ({ context: { selfId }, params: { eventId }, body: { region: { coordinate } = { coordinate: undefined } } = {} }) =>
    conn.transaction((tx) =>
      getEventSQL(tx, eventId, selfId)
        .mapFailure(result => result.error === "event-not-found" ? resp(404, result) : resp(403, result))
        .passthroughSuccess(event =>
          event.hostId === selfId
            ? failure(resp(400, { error: "user-is-host" })) as never
            : success()
        )
        .passthroughSuccess(event =>
          event.endedDateTime
            ? failure(resp(403, { error: event.startDateTime > event.endedDateTime ? "event-was-cancelled" as const : "event-has-ended" as const }))
            : success()
        )
        // NB: Creates typescript union so it's accepted by TiFShared API
        .mapFailure(result => result.status === 403 ? resp(403, { error: result.data.error }) : result)
        .mapSuccess(async (event) => {
          const [status, hasArrived = false, trackableRegions] = await Promise.all([
            addUserToAttendeeList(tx, selfId, eventId, "attending")
              .mapSuccess(
                ({ rowsAffected }) =>
                  rowsAffected > 0 ? (201) : (200)
              ).unwrap(),
            (coordinate && areCoordinatesEqual(coordinate, event))
              ? insertArrival(tx, selfId, coordinate).withSuccess(true).unwrap()
              : success().unwrap(),
            upcomingEventArrivalRegionsSQL(tx, selfId).unwrap()
          ])

          if (status === 201) {
            return resp(201, { id: event.id, hasArrived, trackableRegions })
          } else {
            return resp(200, { id: event.id, hasArrived, trackableRegions })
          }
        })
    )
      .unwrap()
) satisfies TiFAPIRouterExtension["joinEvent"]
