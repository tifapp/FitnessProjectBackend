import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import {
  DBTifEvent,
  addAttendanceData,
  tifEventResponseFromDatabaseEvent,
  userEventsSQL
} from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api/Transport"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { authenticatedEndpoint } from "../auth"

export const getEventsByRegion = (
  conn: MySQLExecutableDriver,
  {
    userLocation: { latitude: userLatitude, longitude: userLongitude },
    ...rest
  }: {
    userId: string
    userLocation: LocationCoordinate2D
    radius: number
  }
) => {
  return conn.queryResult<DBTifEvent>(userEventsSQL("geospatial"), {
    userLatitude,
    userLongitude,
    ...rest
  })
}

export const exploreEvents = authenticatedEndpoint<"exploreEvents">(
  ({ context: { selfId: userId }, body: { userLocation, radius } }) =>
    conn
      .transaction((tx) =>
        getEventsByRegion(tx, {
          userId,
          userLocation,
          radius
        })
          .flatMapSuccess((events) => addAttendanceData(tx, events, userId))
          .mapSuccess((events) => events.map(tifEventResponseFromDatabaseEvent))
          .mapSuccess((events) => resp(200, { events }))
      )
      .unwrap()
)
