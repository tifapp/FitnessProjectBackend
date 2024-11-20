import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import {
  DBTifEvent,
  getAttendeeData,
  tifEventResponseFromDatabaseEvent
} from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { authenticatedEndpoint } from "../auth"

export const getEventsByRegion = (
  conn: MySQLExecutableDriver,
  {
    userLocation: { latitude: userLatitude, longitude: userLongitude },
    ...rest
  }: {
    userId: string
    userLocation: LocationCoordinate2D
    radius: number
  }
) =>
  conn.queryResult<DBTifEvent>(
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
        ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(TifEventView.longitude, TifEventView.latitude)) < :radius
        AND TifEventView.endDateTime > NOW()
        AND TifEventView.endedDateTime IS NULL
        AND (UserRelationOfHostToUser.status IS NULL OR UserRelationOfHostToUser.status <> 'blocked')
        AND (UserRelationOfUserToHost.status IS NULL OR UserRelationOfUserToHost.status <> 'blocked')
  `,
    { userLatitude, userLongitude, ...rest }
  )

export const exploreEvents = authenticatedEndpoint<"exploreEvents">(
  ({ context: { selfId: userId }, body: { userLocation, radius } }) =>
    conn
      .transaction((tx) =>
        getEventsByRegion(tx, {
          userId,
          userLocation,
          radius
        })
          .flatMapSuccess((events) => getAttendeeData(tx, events, userId))
          .mapSuccess((events) => events.map(tifEventResponseFromDatabaseEvent))
          .mapSuccess((events) => resp(200, { events }))
      )
      .unwrap()
)
