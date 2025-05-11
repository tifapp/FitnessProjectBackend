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
import {
  EventsTimelineDirection,
  EventsTimelinePageToken
} from "TiFShared/api/models/Event"

type EventsTimelineQuery = {
  selfId: UserID
  limit: number
  direction: "forwards" | "backwards"
  startDate: Date
  offset: number
}

const DIRECTION_SQL = {
  forwards: { order: "ASC", where: UserEventSQL.TIMELINE_FORWARDS_WHERE },
  backwards: { order: "DESC", where: UserEventSQL.TIMELINE_BACKWARDS_WHERE }
}

const timelinePageEvents = (
  conn: MySQLExecutableDriver,
  query: EventsTimelineQuery
) => {
  const directionSQL = DIRECTION_SQL[query.direction]
  return conn.queryResult<DBTifEvent>(
    `
    ${UserEventSQL.BASE}
    ${UserEventSQL.ATTENDANCE_INNER_JOIN}
    ${directionSQL.where}
    ${UserEventSQL.ORDER_BY_START_TIME} ${directionSQL.order}
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
  hasNextPageInDirection: boolean
}

const timelinePage = (
  query: EventsTimelineQuery
): PromiseResult<EventsTimelinePage, never> => {
  return conn.transaction((tx) => {
    return timelinePageEvents(tx, query)
      .mapSuccess((events) => {
        if (events.length < query.limit + 1) {
          return { events, hasNextPageInDirection: false }
        }
        const last: DBTifEvent | undefined = events.pop()
        return { events, hasNextPageInDirection: !!last }
      })
      .flatMapSuccess(({ events, hasNextPageInDirection }) => {
        return addAttendanceData(tx, events, query.selfId).mapSuccess(
          (events) => ({
            events: events.map(tifEventResponseFromDatabaseEvent),
            hasNextPageInDirection
          })
        )
      })
  })
}

const timelineResponse = (
  page: EventsTimelinePage,
  query: EventsTimelineQuery,
  token?: EventsTimelinePageToken
) => {
  return {
    events: page.events,
    nextToken: base64URLEncode(
      JSON.stringify({
        startDate: token?.startDate ?? query.startDate,
        forwardOffset:
          query.direction === "forwards"
            ? query.offset + page.events.length
            : token?.forwardOffset,
        backwardOffset:
          query.direction === "backwards"
            ? query.offset + page.events.length
            : token?.backwardOffset
      })
    ),
    hasNextPageInDirection: page.hasNextPageInDirection
  }
}

const timelineQuery = (
  selfId: UserID,
  direction: EventsTimelineDirection,
  limit: number,
  token?: EventsTimelinePageToken
) => ({
  selfId,
  limit,
  direction,
  startDate: token?.startDate ?? new Date(),
  offset:
    (direction === "forwards" ? token?.forwardOffset : token?.backwardOffset) ??
    0
})

export const timeline = authenticatedEndpoint<"timeline">(
  ({ context: { selfId }, query: { limit, direction, token } }) => {
    const query = timelineQuery(selfId, direction, limit, token)
    return timelinePage(query)
      .mapSuccess((page) => resp(200, timelineResponse(page, query, token)))
      .unwrap()
  }
)
