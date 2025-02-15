import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import {
  addAttendanceData,
  DBTifEvent,
  tifEventResponseFromDatabaseEvent,
  UserEventSQL
} from "TiFBackendUtils/TiFEventUtils"
import { resp } from "TiFShared/api"
import { UserID } from "TiFShared/domain-models/User"
import { authenticatedEndpoint } from "../auth"
import { userRelations } from "TiFBackendUtils/TiFUserUtils"
import { userNotFoundBody } from "../utils/Responses"

const getUpcomingEvents = (
  conn: MySQLExecutableDriver,
  selfId: UserID,
  userId: UserID,
  maxSecondsToStart: number | undefined
) => {
  const query = maxSecondsToStart
    ? `
  ${UserEventSQL.BASE}
  ${UserEventSQL.ATTENDANCE_INNER_JOIN}
  ${UserEventSQL.MAX_SECONDS_TO_START_WHERE}
  ${UserEventSQL.ORDER_BY_START_TIME}
  `
    : `
  ${UserEventSQL.BASE}
  ${UserEventSQL.ATTENDANCE_INNER_JOIN}
  ${UserEventSQL.BASE_WHERE}
  ${UserEventSQL.ORDER_BY_START_TIME}
  `
  return conn.queryResult<DBTifEvent>(query, {
    userId: selfId,
    attendingUserId: userId,
    currentTimestamp: new Date(), // TODO: - Handle timezone logic.
    maxSecondsToStart
  })
}

const fetchUpcomingEvents = (
  conn: MySQLExecutableDriver,
  selfId: UserID,
  userId: UserID,
  maxSecondsToStart: number | undefined
) => {
  return conn.transaction((tx) => {
    return userRelations(tx, {
      fromUserId: selfId,
      toUserId: userId
    }).flatMapSuccess(() => {
      return getUpcomingEvents(tx, selfId, userId, maxSecondsToStart)
        .flatMapSuccess((events) => addAttendanceData(tx, events, selfId))
        .mapSuccess((events) => {
          return events
            .filter((e) => e.endDateTime.getTime() > Date.now())
            .map(tifEventResponseFromDatabaseEvent)
        })
    })
  })
}

export const upcomingEvents = authenticatedEndpoint<"upcomingEvents">(
  ({ context: { selfId }, query: { userId, maxSecondsToStart } }) => {
    return fetchUpcomingEvents(
      conn,
      selfId,
      userId ?? selfId,
      maxSecondsToStart
    )
      .mapSuccess((events) => resp(200, { events }))
      .mapFailure((error) => {
        return error === "no-results"
          ? resp(404, userNotFoundBody(userId))
          : resp(403, { error, userId })
      })
      .unwrap()
  }
)
