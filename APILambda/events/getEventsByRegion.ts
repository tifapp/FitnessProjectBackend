import { SQLExecutable, conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { DatabaseEvent } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"

type GetEventsRequest = {
  userId: string
  latitude: number | string
  longitude: number | string
  radiusMeters: number
}

const getEventsByRegion = (
  conn: SQLExecutable,
  request: GetEventsRequest
) =>
  conn.queryResults<DatabaseEvent>(
    `SELECT E.*, COUNT(A.userId) AS attendee_count, 
    CASE WHEN F.user IS NOT NULL THEN 1 ELSE 0 END AS is_friend 
    FROM event E JOIN Location L ON E.id = L.eventId 
    LEFT JOIN eventAttendance A ON E.id = A.eventId 
    LEFT JOIN Friends F ON E.hostId = F.friend AND F.user = :userId 
    WHERE ST_Distance_Sphere(POINT(:longitude, :latitude), POINT(lon, lat)) < :radiusMeters 
    AND E.endDate > NOW() 
    AND :userId NOT IN (SELECT blocked 
    FROM blockedUsers 
    WHERE user = E.hostId AND blocked = :userId) 
    GROUP BY E.id
  `,
    request
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
  router.getWithValidation("/", {}, (req, res) => conn.transaction((tx) => getEventsByRegion(tx, {
    userId: res.locals.selfId,
    longitude: req.query.longitude as unknown as number,
    latitude: req.query.latitude as unknown as number,
    radiusMeters: req.query.radiusMeters as unknown as number
  })
    .mapFailure(error => res.status(401).json({ error }))
    .mapSuccess(result => res.status(200).json(result))
  ))
}
