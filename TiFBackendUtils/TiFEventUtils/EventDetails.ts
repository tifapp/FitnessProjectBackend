import { failure, success } from "TiFShared/lib/Result"
import { MySQLExecutableDriver } from "../MySQLDriver"
import { DBTifEvent } from "./TiFEventResponse"
import { UserEventSQL } from "./UserEvent"

export const getEventSQL = (
  conn: MySQLExecutableDriver,
  eventId: number,
  userId: string
) =>
  conn
    .queryFirstResult<DBTifEvent>(
      `
      ${UserEventSQL.BASE}
      WHERE TifEventView.id = :eventId;
      `,
      { eventId, userId }
    )
    .withFailure({ error: "event-not-found" as const })
    .passthroughSuccess((event) =>
      event.fromThemToYou === "blocked"
        ? failure(blockedEvent(event))
        : success()
    )

export const blockedEvent = (event: DBTifEvent) =>
  ({
    error: "blocked-you",
    host: {
      relationStatus: "blocked-you",
      handle: event.hostHandle,
      id: event.hostId,
      name: event.hostName
    },
    id: event.id,
    title: event.title,
    createdDateTime: event.createdDateTime,
    updatedDateTime: event.updatedDateTime
  } as const)
