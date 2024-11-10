import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { DBupcomingEvent } from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { EventArrivalRegion, EventID } from "TiFShared/domain-models/Event"
import { authenticatedEndpoint } from "../../auth"

const mapEventsToRegions = (events: DBupcomingEvent[]): EventArrivalRegion[] =>
  Array.from(
    events
      .reduce((acc, { id, hasArrived, latitude, longitude }) => {
        const key = `${hasArrived}-${latitude}-${longitude}`

        if (!acc.has(key)) {
          acc.set(key, {
            eventIds: [],
            coordinate: { latitude, longitude },
            hasArrived,
            arrivalRadiusMeters: 500 // TODO: Parameterize
          })
        }

        const existingRegion = acc.get(key)
        if (existingRegion) {
          existingRegion.eventIds.push(id as EventID)
        }

        return acc
      }, new Map<string, EventArrivalRegion>())
      .values()
  )

// TODO: 24 hour window should be parameterized based on env variable
export const upcomingEventArrivalRegionsSQL = (
  conn: MySQLExecutableDriver,
  userId: string
) =>
  conn
    .queryResult<DBupcomingEvent>(
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
    )
    .mapSuccess(mapEventsToRegions)

export const upcomingEventArrivalRegions =
  authenticatedEndpoint<"upcomingEventArrivalRegions">(
    ({ context: { selfId } }) =>
      upcomingEventArrivalRegionsSQL(conn, selfId)
        .mapSuccess((trackableRegions) => resp(200, { trackableRegions }))
        .unwrap()
  )
