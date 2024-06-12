import { DBTifEvent, MySQLExecutableDriver, conn, setEventAttendeesFields, tifEventResponseFromDatabaseEvent } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const EventsRequestSchema = z.object({
  userLatitude: z.number(),
  userLongitude: z.number(),
  radius: z.number()
})

type EventsRequestByRegion = {
  userId: string
  userLatitude: number
  userLongitude: number
  radius: number
}

export const getEventsByRegion = (
  conn: MySQLExecutableDriver,
  eventsRequest: EventsRequestByRegion
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

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getEventsByRegionRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Get events by region
   */
  router.postWithValidation(
    "/region",
    { bodySchema: EventsRequestSchema },
    (req, res) =>
      conn
        .transaction((tx) =>
          getEventsByRegion(tx, {
            userId: res.locals.selfId,
            userLatitude: req.body.userLatitude,
            userLongitude: req.body.userLongitude,
            radius: req.body.radius
          }).flatMapSuccess((result) => setEventAttendeesFields(tx, result, res.locals.selfId).mapSuccess((events) => events.map((event) => tifEventResponseFromDatabaseEvent(event)))
            .mapSuccess((result) => {
              return res.status(200).json({ events: result })
            })
          )
        )
  )
}
