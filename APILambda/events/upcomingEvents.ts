import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import {
  addAttendanceData,
  DBTifEvent,
  tifEventResponseFromDatabaseEvent,
  UserEventSQL
} from "TiFBackendUtils/TiFEventUtils"
import { userRelations } from "TiFBackendUtils/TiFUserUtils"
import { resp } from "TiFShared/api"
import { UserID } from "TiFShared/domain-models/User"
import { authenticatedEndpoint } from "../auth"
import { userNotFoundBody } from "../utils/Responses"
import { FixedDateRange } from "TiFShared/domain-models/FixedDateRange"

type UpcomingEventsQuery = {
  userId: UserID
  selfId: UserID
  maxSecondsToStart?: number
  dateRange?: FixedDateRange
}

const upcomingEventsSQL = (query: UpcomingEventsQuery) => {
  if (query.maxSecondsToStart) {
    return `
    ${UserEventSQL.BASE}
    ${UserEventSQL.ATTENDANCE_INNER_JOIN}
    ${UserEventSQL.MAX_SECONDS_TO_START_WITH_USER_ATTENDANCE_WHERE}
    ${UserEventSQL.ORDER_BY_START_TIME}
    `
  } else if (query.dateRange) {
    return `
    ${UserEventSQL.BASE}
    ${UserEventSQL.ATTENDANCE_INNER_JOIN}
    ${UserEventSQL.DATE_RANGE_WITH_USER_ATTENDANCE_WHERE}
    ${UserEventSQL.ORDER_BY_START_TIME}
    `
  } else {
    return `
    ${UserEventSQL.BASE}
    ${UserEventSQL.ATTENDANCE_INNER_JOIN}
    ${UserEventSQL.USER_ATTENDANCE_WITH_NON_PAST_EVENTS_WHERE}
    ${UserEventSQL.ORDER_BY_START_TIME}
    `
  }
}

const getUpcomingEvents = (
  conn: MySQLExecutableDriver,
  query: UpcomingEventsQuery
) => {
  return conn.queryResult<DBTifEvent>(upcomingEventsSQL(query), {
    userId: query.selfId,
    attendingUserId: query.userId,
    currentTimestamp: new Date(), // TODO: - Handle timezone logic.
    maxSecondsToStart: query.maxSecondsToStart,
    startDateTime: query.dateRange?.startDateTime,
    endDateTime: query.dateRange?.endDateTime
  })
}

const fetchUpcomingEvents = (
  conn: MySQLExecutableDriver,
  query: UpcomingEventsQuery
) => {
  return conn.transaction((tx) => {
    return userRelations(tx, {
      fromUserId: query.selfId,
      toUserId: query.userId
    }).flatMapSuccess(() => {
      return getUpcomingEvents(tx, query)
        .flatMapSuccess((events) => addAttendanceData(tx, events, query.selfId))
        .mapSuccess((events) => {
          return events.map(tifEventResponseFromDatabaseEvent)
        })
    })
  })
}

export const upcomingEvents = authenticatedEndpoint<"upcomingEvents">(
  ({
    context: { selfId },
    query: { userId, maxSecondsToStart, dateRange }
  }) => {
    const query = {
      selfId,
      userId: userId ?? selfId,
      maxSecondsToStart,
      dateRange
    }
    return fetchUpcomingEvents(conn, query)
      .mapSuccess((events) => resp(200, { events }))
      .mapFailure((error) => {
        return error === "no-results"
          ? resp(404, userNotFoundBody(userId))
          : resp(403, { error, userId })
      })
      .unwrap()
  }
)
