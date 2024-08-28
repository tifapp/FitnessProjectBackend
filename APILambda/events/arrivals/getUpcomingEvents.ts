import { MySQLExecutableDriver, UpcomingEvent, conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env"
import { ValidatedRouter } from "../../validation"

type EventRegion = {
  eventIds: number[]
  coordinate: {
    latitude: number
    longitude: number
  }
  arrivalRadiusMeters: number
  hasArrived: boolean
}

const mapEventsToRegions = (events: UpcomingEvent[]): EventRegion[] => {
  const eventRegions = new Map<string, EventRegion>();

  events.forEach(({ id, hasArrived, latitude, longitude }) => {
    const key = `${hasArrived}-${latitude}-${longitude}`;

    if (!eventRegions.has(key)) {
      eventRegions.set(key, {
        eventIds: [],
        coordinate: { latitude, longitude },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        hasArrived: hasArrived === 1 || hasArrived === true, // hasArrived should be treated as int, but is treated as bigint if it occurs in a transaction after TiFEventView
        arrivalRadiusMeters: 500 // TODO: Parameterize
      });
    }

    const existingRegion = eventRegions.get(key);
    if (existingRegion) {
      existingRegion.eventIds.push(id);
    }
  });

  return Array.from(eventRegions.values());
}

// TODO: 24 hour window should be parameterized based on env variable
export const getUpcomingEventsByRegion = (conn: MySQLExecutableDriver, userId: string) => conn.queryResult<UpcomingEvent>(
  `
  SELECT 
    e.*, 
    ua.arrivedDateTime,
    CASE 
      WHEN ua.userId IS NOT NULL THEN TRUE
      ELSE FALSE
    END AS hasArrived
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
      TIMESTAMPDIFF(HOUR, NOW(), e.startDateTime) BETWEEN 0 AND 24
      OR 
      (e.startDateTime <= NOW() AND NOW() <= e.endDateTime)
    )
  ORDER BY 
    e.startDateTime ASC
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
