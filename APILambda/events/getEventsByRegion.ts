import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { DBTifEvent, setEventAttendeesFields, tifEventResponseFromDatabaseEvent } from "TiFBackendUtils/TifEventUtils"
import { resp } from "TiFShared/api"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { TiFAPIRouter } from "../router"

export const getEventsByRegion = (
  conn: MySQLExecutableDriver,
  eventsRequest: {
    userId: string
    userLocation: LocationCoordinate2D,
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
LEFT JOIN userRelations UserRelationOfHostToUser ON TifEventView.hostId = UserRelationOfHostToUser.fromUserId AND UserRelationOfHostToUser.toUserId = :userId
LEFT JOIN userRelations UserRelationOfUserToHost ON UserRelationOfUserToHost.fromUserId = :userId AND UserRelationOfUserToHost.toUserId = TifEventView.hostId
    WHERE 
        ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(TifEventView.longitude, TifEventView.latitude)) < :radius
        AND TifEventView.endDateTime > NOW()
        AND TifEventView.endedDateTime IS NULL
        AND (UserRelationOfHostToUser.status IS NULL OR UserRelationOfHostToUser.status <> 'blocked')
        AND (UserRelationOfUserToHost.status IS NULL OR UserRelationOfUserToHost.status <> 'blocked')
  `,
    { ...eventsRequest }
  )

export const exploreEvents: TiFAPIRouter["exploreEvents"] = ({ context: { selfId: userId }, body: { userLocation, radius } }) =>
  conn
    .transaction((tx) =>
      getEventsByRegion(tx, {
        userId,
        userLocation,
        radius
      }).flatMapSuccess((result) =>
        setEventAttendeesFields(tx, result, userId)
          .mapSuccess((events) => events.map((event) => tifEventResponseFromDatabaseEvent(event)))
          .mapSuccess((events) => resp(200, { events }))
      )
    )
    .unwrap()
