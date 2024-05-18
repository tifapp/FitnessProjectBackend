import { SQLExecutable, UpcomingEvent, conn } from "TiFBackendUtils"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"

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
  const eventRegions: Record<string, EventRegion> = {}

  events.forEach(({ id, hasArrived, latitude, longitude }) => {
    const key = `${hasArrived}-${latitude}-${longitude}`

    if (!eventRegions[key]) {
      eventRegions[key] = {
        eventIds: [],
        coordinate: { latitude, longitude },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        hasArrived: hasArrived === 1 || hasArrived === true, // hasArrived should be treated as int, but is treated as bigint if it occurs in a transaction after TiFEventView
        arrivalRadiusMeters: 500 // TODO: Parameterize
      }
    }

    eventRegions[key].eventIds.push(id)
  })

  return Object.values(eventRegions)
}

// TODO: 24 hour window should be parameterized based on env variable
export const getUpcomingEventsByRegion = (conn: SQLExecutable, userId: string) => conn.queryResult<UpcomingEvent>(
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
