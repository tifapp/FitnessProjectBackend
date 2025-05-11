import { resp } from "TiFShared/api"
import { authenticatedEndpoint } from "../auth"
import { UserID } from "TiFShared/domain-models/User"
import { conn } from "TiFBackendUtils"
import {
  addAttendanceData,
  DBTifEvent,
  TiFEvent,
  tifEventResponseFromDatabaseEvent,
  UserEventSQL
} from "TiFBackendUtils/TiFEventUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { PromiseResult } from "TiFShared/lib/Result"
import { base64URLEncode } from "TiFShared/lib/Base64URLCoding"
import { EventsTimelinePageToken } from "TiFShared/api/models/Event"

type EventsTimelineQuery = {
  selfId: UserID
  limit: number
  direction: "forwards" | "backwards"
  startDate: Date
  offset: number
}

const timelinePageEvents = (
  conn: MySQLExecutableDriver,
  query: EventsTimelineQuery
) => {
  return conn.queryResult<DBTifEvent>(
    `
    ${UserEventSQL.BASE}
    ${UserEventSQL.ATTENDANCE_INNER_JOIN}
    ${UserEventSQL.TIMELINE_FORWARDS_WHERE}
    ${UserEventSQL.ORDER_BY_START_TIME}
    LIMIT :limit
    OFFSET :offset
    `,
    {
      userId: query.selfId,
      attendingUserId: query.selfId,
      startDateTime: query.startDate,
      offset: query.offset,
      limit: query.limit + 1
    }
  )
}

type EventsTimelinePage = {
  events: TiFEvent[]
  nextDate?: Date
}

const timelinePage = (
  query: EventsTimelineQuery
): PromiseResult<EventsTimelinePage, never> => {
  return conn.transaction((tx) => {
    return timelinePageEvents(tx, query)
      .mapSuccess((events) => {
        if (events.length < query.limit + 1) {
          return { events, nextDate: undefined }
        }
        const last: DBTifEvent | undefined = events.pop()
        return { events, nextDate: last?.startDateTime }
      })
      .flatMapSuccess(({ events, nextDate }) => {
        return addAttendanceData(tx, events, query.selfId).mapSuccess(
          (events) => ({
            events: events.map(tifEventResponseFromDatabaseEvent),
            nextDate
          })
        )
      })
  })
}

const timelineResponse = (
  page: EventsTimelinePage,
  query: EventsTimelineQuery
) => {
  return {
    events: page.events,
    nextToken: base64URLEncode(
      JSON.stringify({
        startDate: query.startDate,
        forwardOffset: query.offset + page.events.length
      })
    ),
    hasNextPage: !!page.nextDate,
    hasPreviousPage: false
  }
}

export const timeline = authenticatedEndpoint<"timeline">(
  ({ context: { selfId }, query: { limit, direction, token } }) => {
    const query = {
      selfId,
      limit,
      direction,
      startDate: token?.startDate ?? new Date(),
      offset: token?.forwardOffset ?? 0
    }
    return timelinePage(query)
      .mapSuccess((page) => resp(200, timelineResponse(page, query)))
      .unwrap()
  }
)
