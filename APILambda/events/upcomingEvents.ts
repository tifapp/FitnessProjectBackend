import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import {
  addAttendanceData,
  DBTifEvent,
  tifEventResponseFromDatabaseEvent,
  userEventsSQL
} from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api"
import { UserID } from "TiFShared/domain-models/User"
import { authenticatedEndpoint } from "../auth"

export const getUpcomingEvents = (
  conn: MySQLExecutableDriver,
  userId: UserID
) => conn.queryResult<DBTifEvent>(userEventsSQL(), { userId })

const fetchUpcomingEvents = (conn: MySQLExecutableDriver, selfId: UserID) => {
  return conn.transaction((tx) => {
    return getUpcomingEvents(tx, selfId)
      .flatMapSuccess((events) => addAttendanceData(tx, events, selfId))
      .mapSuccess((events) => {
        return events
          .filter((e) => e.endDateTime.getTime() > Date.now())
          .map(tifEventResponseFromDatabaseEvent)
      })
  })
}

export const upcomingEvents = authenticatedEndpoint<"upcomingEvents">(
  ({ context: { selfId: userId } }) => {
    return fetchUpcomingEvents(conn, userId)
      .mapSuccess((events) => resp(200, { events }))
      .unwrap()
  }
)
