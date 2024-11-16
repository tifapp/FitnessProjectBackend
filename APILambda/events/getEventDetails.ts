import { conn } from "TiFBackendUtils"
import {
  addAttendanceData,
  getEventSQL,
  tifEventResponseFromDatabaseEvent
} from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { authenticatedEndpoint } from "../auth"

export const eventDetails = authenticatedEndpoint<"eventDetails">(
  ({ context: { selfId }, params: { eventId } }) =>
    conn
      .transaction((tx) =>
        getEventSQL(conn, Number(eventId), selfId)
          .mapFailure((result) =>
            result.error === "event-not-found"
              ? resp(404, result)
              : resp(403, result)
          )
          .flatMapSuccess((event) => addAttendanceData(tx, [event], selfId))
          .mapSuccess(([event]) => tifEventResponseFromDatabaseEvent(event))
          .mapSuccess((event) => resp(200, event))
      )
      .unwrap()
)
