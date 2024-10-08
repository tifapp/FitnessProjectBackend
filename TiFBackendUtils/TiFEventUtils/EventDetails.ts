import { failure, success } from "TiFShared/lib/Result"
import { MySQLExecutableDriver } from "../MySQLDriver"
import { DBTifEvent } from "./TiFEventResponse"

export const getEventSQL = (
  conn: MySQLExecutableDriver,
  eventId: number,
  userId: string
) =>
  conn
    .queryFirstResult<DBTifEvent>(
      `
      SELECT TifEventView.*,
       CASE
           WHEN TifEventView.hostId = :userId THEN 'current-user'
           ELSE CASE
                    WHEN UserRelationOfHostToUser.status IS NULL THEN 'not-friends'
                    ELSE UserRelationOfHostToUser.status
                END
       END AS fromThemToYou,
       CASE
           WHEN TifEventView.hostId = :userId THEN 'current-user'
           ELSE CASE
                    WHEN UserRelationOfUserToHost.status IS NULL THEN 'not-friends'
                    ELSE UserRelationOfUserToHost.status
                END
       END AS fromYouToThem
      FROM TifEventView
      LEFT JOIN userRelationships UserRelationOfHostToUser
          ON TifEventView.hostId = UserRelationOfHostToUser.fromUserId
          AND UserRelationOfHostToUser.toUserId = :userId
      LEFT JOIN userRelationships UserRelationOfUserToHost
          ON UserRelationOfUserToHost.fromUserId = :userId
          AND UserRelationOfUserToHost.toUserId = TifEventView.hostId
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

export const blockedEvent = (event: DBTifEvent) => ({
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
}) as const
