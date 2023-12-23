import { SQLExecutable, conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env.js"
import { DatabaseEvent } from "../../shared/SQL.js"
import { ValidatedRouter } from "../../validation.js"

type EventRegion = {
  eventIds: number[];
  coordinate: {
    latitude: number;
    longitude: number;
  };
  arrivalRadiusMeters: number;
  isArrived: boolean;
}

const mapEventsToRegions = (events: DatabaseEvent[]): EventRegion[] => {
  const eventRegions: Record<string, EventRegion> = {}

  events.forEach(event => {
    const key = `${event.arrivalStatus}-${event.latitude}-${event.longitude}`

    if (!eventRegions[key]) {
      eventRegions[key] = {
        eventIds: [],
        coordinate: { latitude: event.latitude, longitude: event.longitude },
        isArrived: event.arrivalStatus === "arrived",
        arrivalRadiusMeters: 500 // TODO: Parameterize
      }
    }

    eventRegions[key].eventIds.push(parseInt(event.id))
  })

  return Object.values(eventRegions)
}

// TODO: 24 hour window should be parameterized based on env variable
export const getUpcomingEventsByRegion = (conn: SQLExecutable, userId: string) => conn.queryResults<DatabaseEvent>(
  `
  SELECT 
    e.*, 
    ua.arrivedAt,
    CASE 
      WHEN ua.userId IS NOT NULL THEN "arrived"
      ELSE "not-arrived"
    END AS arrivalStatus
  FROM 
    event e
  LEFT JOIN 
    userArrivals ua ON e.latitude = ua.latitude 
                    AND e.longitude = ua.longitude 
                    AND ua.userId = :userId
  JOIN 
    eventAttendance ea ON e.id = ea.eventId AND ea.userId = :userId
  WHERE 
    (
      TIMESTAMPDIFF(HOUR, NOW(), e.startTimestamp) BETWEEN 0 AND 24
      OR 
      (e.startTimestamp <= NOW() AND NOW() <= e.endTimestamp)
    )
  ORDER BY 
    e.startTimestamp ASC
  LIMIT 100;
  `,
  { userId }
).mapSuccess(mapEventsToRegions)

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getUpcomingEventsByRegionRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  router.getWithValidation(
    "/upcoming",
    {},
    (req, res) => getUpcomingEventsByRegion(
      conn,
      res.locals.selfId
    )
      .mapSuccess((events) => res.status(200).send({ upcomingRegions: events }))
  )
}
