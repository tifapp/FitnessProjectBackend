import { conn } from "TiFBackendUtils"
import { getEventSQL } from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { authenticatedEndpoint } from "../auth"

/**
 * End or cancel an event given an event id.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const endEvent = authenticatedEndpoint<"endEvent">(
  ({ context: { selfId: hostId }, params: { eventId } }) =>
    conn
      .transaction((tx) =>
        getEventSQL(tx, eventId, hostId)
          .mapFailure((result) =>
            result.error === "event-not-found"
              ? resp(404, result)
              : (resp(403, result) as never)
          )
          .passthroughSuccess((event) =>
            event.hostId === hostId
              ? success()
              : failure(resp(403, { error: "user-not-host" }))
          )
          .passthroughSuccess((event) =>
            event.endedDateTime
              ? failure(resp(403, { error: "event-has-ended" }))
              : success()
          )
          // NB: Creates typescript union so it's accepted by TiFShared API
          .mapFailure((error) =>
            error.status === 403 ? resp(403, error.data) : error
          )
          .flatMapSuccess(() =>
            tx.executeResult(
              `UPDATE event
          SET endedDateTime = NOW()
          WHERE event.id = :eventId
          AND event.hostId = :hostId
          AND endedDateTime IS NULL;`,
              { eventId, hostId }
            )
          )
          .mapSuccess(() => resp(204))
      )
      .unwrap()
)
