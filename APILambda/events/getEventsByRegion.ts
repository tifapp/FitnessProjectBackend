import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseEvent } from "../shared/SQL.js"
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

const getEventsByRegion = (
  conn: SQLExecutable,
  eventsRequest: EventsRequestByRegion
) =>
  conn.queryResults<DatabaseEvent>(
    `
    SELECT E.*, COUNT(A.userId) AS totalAttendees, UserRelationOfHostToUser.status AS relationUserToHost, UserRelationOfUserToHost.status AS relationHostToUser, SUBSTRING_INDEX(GROUP_CONCAT(A.userId ORDER BY A.joinDate ASC), ',', 3) AS attendeesPreview
        FROM event E
        JOIN location L ON L.lat = :userLatitude AND L.lon = :userLongitude
        JOIN eventAttendance A ON E.id = A.eventId
        JOIN userRelations UserRelationOfHostToUser ON UserRelationOfHostToUser.fromUserId = E.hostId AND UserRelationOfHostToUser.toUserId = :userId
        JOIN userRelations UserRelationOfUserToHost ON UserRelationOfUserToHost.fromUserId = :userId AND UserRelationOfUserToHost.toUserId = E.hostId
        WHERE ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(E.longitude, E.latitude)) < :radius
        AND E.startTimestamp > NOW()
        AND A.userId != E.hostId
        AND UserRelationOfHostToUser.status != 'blocked'
        AND UserRelationOfUserToHost.status != 'blocked'
        AND A.userId != E.hostId
        GROUP BY E.id
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
      getEventsByRegion(conn, {
        userId: res.locals.selfId,
        userLatitude: req.body.userLatitude,
        userLongitude: req.body.userLongitude,
        radius: req.body.radius
      })
        .mapFailure((error) => res.status(401).json({ error }))
        .mapSuccess((result) => res.status(200).json(result))
  )
}
