import { conn } from "TiFBackendUtils"
import { getAttendeeData, tifEventResponseFromDatabaseEvent } from "TiFBackendUtils/TifEventUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouterExtension } from "../router"
import { getEventSQL } from "../utils/eventDetails"

export const eventDetails = (
  ({ context: { selfId }, params: { eventId } }) =>
    conn.transaction((tx) =>
      getEventSQL(conn, Number(eventId), selfId)
        .mapFailure(result => result.error === "event-not-found" ? resp(404, result) : resp(403, result))
        .flatMapSuccess((event) => getAttendeeData(tx, [event], selfId))
        .mapSuccess(([event]) => tifEventResponseFromDatabaseEvent(event))
        .mapSuccess((event) => resp(200, event))
    )
      .unwrap()
) satisfies TiFAPIRouterExtension["eventDetails"]
