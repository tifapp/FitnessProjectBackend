import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { addAttendanceData, DBTifEvent, tifEventResponseFromDatabaseEvent } from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api"
import { UserID } from "TiFShared/domain-models/User"
import { TiFAPIRouterExtension } from "../router"

export const getUpcomingEvents = (
  conn: MySQLExecutableDriver,
  userId: UserID
) => conn.queryResult<DBTifEvent>(
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
    LEFT JOIN userRelationships UserRelationOfHostToUser ON TifEventView.hostId = UserRelationOfHostToUser.fromUserId AND UserRelationOfHostToUser.toUserId = :userId
    LEFT JOIN userRelationships UserRelationOfUserToHost ON UserRelationOfUserToHost.fromUserId = :userId AND UserRelationOfUserToHost.toUserId = TifEventView.hostId
    WHERE   
        TifEventView.endDateTime > CURRENT_TIMESTAMP(3)
        AND TifEventView.endedDateTime IS NULL
        AND (UserRelationOfHostToUser.status IS NULL OR UserRelationOfHostToUser.status <> 'blocked')
        AND (UserRelationOfUserToHost.status IS NULL OR UserRelationOfUserToHost.status <> 'blocked')
    ORDER BY TifEventView.startDateTime
    `,
  { userId }
)

export const upcomingEvents = (
  ({ context: { selfId: userId } }) =>
    conn
      .transaction((tx) =>
        getUpcomingEvents(tx,
          userId
        )
          .flatMapSuccess((events) => addAttendanceData(tx, events, userId))
          .mapSuccess((events) => events.filter((item) => item.endDateTime.getTime() > Date.now()).map(tifEventResponseFromDatabaseEvent))
          .mapSuccess((events) => resp(200, { events }))
      )
      .unwrap()
) satisfies TiFAPIRouterExtension["upcomingEvents"]
