import { resp } from "TiFShared/api"
import { authenticatedEndpoint } from "../auth"
import { UserID } from "TiFShared/domain-models/User"
import { conn } from "TiFBackendUtils"
import {
  addAttendanceData,
  DBTifEvent,
  tifEventResponseFromDatabaseEvent,
  UserEventSQL
} from "TiFBackendUtils/TiFEventUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { promiseResult, success } from "TiFShared/lib/Result"
import { base64URLEncode } from "TiFShared/lib/Base64URLCoding"
import {
  EventsTimelineDirection,
  EventsTimelinePageToken
} from "TiFShared/api/models/Event"

const encodedNextToken = (token: EventsTimelinePageToken) => {
  return base64URLEncode(JSON.stringify(token))
}

type EventsTimelinePageQuery = {
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

type EventsDatabaseTimelinePage = {
  events: DBTifEvent[]
  hasNextPageInDirection: boolean
}

const timelinePageEvents = async (
  conn: MySQLExecutableDriver,
  query: EventsTimelinePageQuery
) => {
  const directionSQL = DIRECTION_SQL[query.direction]
  const events = await conn.query<DBTifEvent>(
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
  if (events.length < query.limit + 1) {
    return { events, hasNextPageInDirection: false }
  }
  const last: DBTifEvent | undefined = events.pop()
  return { events, hasNextPageInDirection: !!last }
}

const timelinePageResponse = (
  { events, hasNextPageInDirection }: EventsDatabaseTimelinePage,
  query: EventsTimelinePageQuery,
  token: EventsTimelinePageToken
) => ({
  events: events.map(tifEventResponseFromDatabaseEvent),
  nextToken: encodedNextToken({
    ...token,
    forwardOffset:
      query.direction === "forwards"
        ? query.offset + events.length
        : token.forwardOffset,
    backwardOffset:
      query.direction === "backwards"
        ? query.offset + events.length
        : token.backwardOffset
  }),
  hasNextForwardPage:
    query.direction === "forwards"
      ? hasNextPageInDirection
      : !!token.forwardOffset,
  hasNextBackwardPage:
    query.direction === "backwards"
      ? hasNextPageInDirection
      : !!token.backwardOffset
})

const timelinePage = (
  query: EventsTimelinePageQuery,
  token: EventsTimelinePageToken
) => {
  return conn.transaction((tx) => {
    const promise = timelinePageEvents(tx, query).then((p) => success(p))
    return promiseResult(promise).flatMapSuccess(
      ({ events, hasNextPageInDirection }) => {
        return addAttendanceData(tx, events, query.selfId).mapSuccess(
          (events) => {
            return timelinePageResponse(
              { events, hasNextPageInDirection },
              query,
              token
            )
          }
        )
      }
    )
  })
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

type EventsFirstTimelinePageQuery = {
  forwardQuery: EventsTimelinePageQuery
  backwardQuery: EventsTimelinePageQuery
}

const databaseTimelinePage = (
  result: PromiseSettledResult<EventsDatabaseTimelinePage>
) => {
  if (result.status === "rejected") {
    return { events: [], hasNextPageInDirection: false }
  }
  return result.value
}

const firstTimelinePage = (query: EventsFirstTimelinePageQuery) => {
  return conn.transaction((tx) => {
    const promise = Promise.allSettled<EventsDatabaseTimelinePage>([
      timelinePageEvents(tx, query.backwardQuery),
      timelinePageEvents(tx, query.forwardQuery)
    ]).then((r) => success(r.map(databaseTimelinePage)))
    return promiseResult(promise).flatMapSuccess(([page1, page2]) => {
      const events = [...page1.events, ...page2.events]
      return addAttendanceData(
        tx,
        events,
        query.forwardQuery.selfId
      ).mapSuccess((events) => ({
        events: events.map(tifEventResponseFromDatabaseEvent),
        hasNextForwardPage: page2.hasNextPageInDirection,
        hasNextBackwardPage: page1.hasNextPageInDirection,
        nextToken: encodedNextToken({
          startDate: query.forwardQuery.startDate,
          forwardOffset: page2.hasNextPageInDirection
            ? page2.events.length
            : undefined,
          backwardOffset: page1.hasNextPageInDirection
            ? page1.events.length
            : undefined
        })
      }))
    })
  })
}

const firstTimelinePageQuery = (
  selfId: UserID,
  direction: EventsTimelineDirection,
  limit: number
) => {
  const backwardLimit =
    direction === "forwards" ? Math.floor(limit / 2) : Math.ceil(limit / 2)
  const forwardLimit =
    direction === "backwards" ? Math.floor(limit / 2) : Math.ceil(limit / 2)
  return {
    forwardQuery: timelineQuery(selfId, "forwards", forwardLimit),
    backwardQuery: timelineQuery(selfId, "backwards", backwardLimit)
  }
}

export const timeline = authenticatedEndpoint<"timeline">(
  ({ context: { selfId }, query: { limit, direction, token } }) => {
    if (!token) {
      return firstTimelinePage(firstTimelinePageQuery(selfId, direction, limit))
        .mapSuccess((page) => resp(200, page))
        .unwrap()
    }
    return timelinePage(timelineQuery(selfId, direction, limit, token), token)
      .mapSuccess((page) => resp(200, page))
      .unwrap()
  }
)
