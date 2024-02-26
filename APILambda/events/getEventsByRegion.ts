import { SQLExecutable, conn } from "TiFBackendUtils"
import { TiFFlatEvent, getEventAttendeesPreview } from "TiFBackendUtils/TifEventUtils.js"
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
  conn: SQLExecutable,
  eventsRequest: EventsRequestByRegion
) =>
  conn.queryResults<TiFFlatEvent>(
    `
    SELECT 
      e.id,
      e.description,
      e.title,
      e.hostId,
      e.shouldHideAfterStartDate AS shouldHideAfterStartDate,
      e.isChatEnabled AS isChatEnabled,
      e.createdAt,
      e.updatedAt,
      host.name AS hostUsername,
      host.handle AS hostHandle,
      UserRelationOfHostToUser.status AS themToYou,
      UserRelationOfUserToHost.status AS youToThem,
      COUNT(ea.eventId) AS attendeeCount,
      userEventAttendance.role AS userAttendeeStatus,
      ea.joinTimestamp AS joinDate,
      e.startTimestamp AS startDateTime,
      e.endTimestamp AS endDateTime,
      GROUP_CONCAT(ea.userId ORDER BY ea.joinTimestamp ASC SEPARATOR ',') AS previewAttendees,
      L.name AS placemarkName,
      L.city, 
      L.country, 
      L.street, 
      L.street_num AS streetNumber, 
      L.timeZone,
      L.lat AS latitude,
      L.lon AS longitude,
      L.postalCode,
      L.region,
      L.isoCountryCode,
      UserRelationOfUserToHost.updatedAt AS updatedAt,
      CASE 
        WHEN ua.userId IS NOT NULL THEN 1
        ELSE 0
      END AS hasArrived
      CASE
        WHEN e.endedAt IS NULL THEN current_timestamp()
        ELSE e.endedAt
      END AS endedAt
    FROM 
        event e
    LEFT JOIN 
        userArrivals ua ON e.latitude = ua.latitude
                        AND e.longitude = ua.longitude
                        AND ua.userId = :userId
    LEFT JOIN userRelations AS relationHostToUser ON e.hostId = relationHostToUser.fromUserId
    LEFT JOIN userRelations AS relationUserToHost ON relationUserToHost.toUserId = e.hostId
    LEFT JOIN 
        location L ON e.latitude = L.lat 
                  AND e.longitude = L.lon
    LEFT JOIN eventAttendance ea ON ea.eventId = e.id
    LEFT JOIN eventAttendance userEventAttendance ON userEventAttendance.userId = :userId
    LEFT JOIN user host ON host.id = e.hostId
    WHERE 
        ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(longitude, latitude)) < :radius
        AND e.endTimestamp > NOW()
        AND (relationHostToUser IS NULL OR relationHostToUser <> 'blocked')
        AND (relationUserToHost IS NULL OR relationUserToHost <> 'blocked')
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
          }).flatMapSuccess((result) => getEventAttendeesPreview(tx, result))
        )
        .mapSuccess((result) => {
          return res.status(200).json(result)
        })
  )
}
