import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { DBTifEvent, setEventAttendeesFields, tifEventResponseFromDatabaseEvent } from "TiFBackendUtils/TifEventUtils"
import { resp } from "TiFShared/api/Transport"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../router"

export const eventDetailsSQL = (
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
      LEFT JOIN userRelations UserRelationOfHostToUser
          ON TifEventView.hostId = UserRelationOfHostToUser.fromUserId
          AND UserRelationOfHostToUser.toUserId = :userId
      LEFT JOIN userRelations UserRelationOfUserToHost
          ON UserRelationOfUserToHost.fromUserId = :userId
          AND UserRelationOfUserToHost.toUserId = TifEventView.hostId
      WHERE TifEventView.id = :eventId;
  `,
      { eventId, userId }
    )
    .withFailure("event-not-found" as const)

export const eventDetails: TiFAPIRouterExtension["eventDetails"] = ({ context: { selfId }, params: { eventId } }) =>
  conn.transaction((tx) =>
    eventDetailsSQL(conn, Number(eventId), selfId)
      .mapFailure((error) => resp(404, { error }))
      .passthroughSuccess(({ fromThemToYou, fromYouToThem, id, title, createdDateTime, updatedDateTime }) =>
        fromThemToYou === "blocked" || fromYouToThem === "blocked"
          ? failure(resp(403, { error: "user-is-blocked", id, title, createdDateTime, updatedDateTime }))
          : success()
      )
      .flatMapSuccess((event) => setEventAttendeesFields(tx, [event], selfId))
      .mapSuccess(([event]) => tifEventResponseFromDatabaseEvent(event))
      .mapSuccess((event) => resp(200, event))
  )
    .unwrap()
