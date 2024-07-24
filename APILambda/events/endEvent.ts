import { conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouter } from "../router"
import { getEventById } from "./getEventById"

/**
 * End or cancel an event given an event id.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const endEvent: TiFAPIRouter["endEvent"] = ({ context: { selfId: hostId }, params: { eventId } }) =>
  conn.transaction((tx) =>
    getEventById(tx, eventId, hostId)
      .withFailure(resp(404, { error: "event-not-found" }))
      .passthroughSuccess(event =>
        event.hostId === hostId ? success() : failure(resp(403, { error: "user-not-host" }))
      )
      .passthroughSuccess(event =>
        event.endedDateTime
          ? failure(resp(403, { error: "event-has-ended" }))
          : success()
      )
      .flatMapSuccess(() =>
        tx.executeResult(
          `UPDATE event 
          SET endedDateTime = NOW()
          WHERE event.id = :eventId
          AND event.hostId = :hostId
          AND endedDateTime IS NULL;`,
          { eventId, hostId }
        ))
      .mapSuccess(() => resp(204))
  )
    .unwrap()
