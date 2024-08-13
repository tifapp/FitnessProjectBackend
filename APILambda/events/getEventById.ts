import { DBTifEvent, MySQLExecutableDriver, conn, setEventAttendeesFields, tifEventResponseFromDatabaseEvent } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { failure, success } from "TiFShared/lib/Result.js"
import { TiFAPIRouter } from "../router.js"

export const getEventById = (
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

export const getEvent: TiFAPIRouter["getEvent"] = ({ context: { selfId }, params: { eventId } }) =>
  conn.transaction((tx) =>
    getEventById(conn, Number(eventId), selfId)
      .mapFailure((error) => resp(404, { error }))
      .passthroughSuccess((event) =>
        event.fromThemToYou === "blocked" ||
            event.fromYouToThem === "blocked"
          ? failure(resp(403, { error: "user-is-blocked" }))
          : success()
      )
      .flatMapSuccess((event) => setEventAttendeesFields(tx, [event], selfId)
        .mapSuccess(([event]) => tifEventResponseFromDatabaseEvent(event))
        .mapSuccess((event) => resp(200, event)))
  )
    .unwrap()
