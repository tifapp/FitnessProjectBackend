import { DBupcomingEvent, MySQLExecutableDriver, conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { EventArrivalRegion, EventID } from "TiFShared/domain-models/Event.js"
import { UserID } from "TiFShared/domain-models/User.js"
import { TiFAPIRouter } from "../../router.js"

const mapEventsToRegions = (events: DBupcomingEvent[]): EventArrivalRegion[] =>
  Array.from(
    events.reduce((acc, { id, hasArrived, latitude, longitude }) => {
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
export const upcomingEventArrivalRegionsSQL = (conn: MySQLExecutableDriver, userId: string) => conn.queryResult<DBupcomingEvent>(
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

export const upcomingEventArrivalRegionsResult = (conn: MySQLExecutableDriver, selfId: UserID) =>
  upcomingEventArrivalRegionsSQL(
    conn,
    selfId
  )
    .mapSuccess(mapEventsToRegions)

export const upcomingEventArrivalRegions: TiFAPIRouter["upcomingEventArrivalRegions"] = ({ context: { selfId } }) =>
  upcomingEventArrivalRegionsResult(conn, selfId)
    .mapSuccess((trackableRegions) => resp(200, { trackableRegions }))
    .unwrap()
