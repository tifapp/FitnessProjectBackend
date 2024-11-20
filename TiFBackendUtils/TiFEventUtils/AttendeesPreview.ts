import { success } from "TiFShared/lib/Result"
import {
    DBeventAttendance,
    DBEventAttendeeCountView,
    DBEventAttendeesView
} from "../DBTypes"
import { MySQLExecutableDriver } from "../MySQLDriver"
import { DBTifEvent } from "./TiFEventResponse"

export const getAttendeeCount = (
  conn: MySQLExecutableDriver,
  eventIds: string[]
) => {
  return conn.queryResult<DBEventAttendeeCountView>(
    ` SELECT
        attendeeCount
      FROM
        EventAttendeeCountView
      WHERE
        id IN (:eventIds)
      GROUP BY id`,
    { eventIds }
  )
}

export const getAttendeeDetails = (
  conn: MySQLExecutableDriver,
  userId: string,
  eventIds: string[]
) => {
  return conn.queryResult<DBeventAttendance>(
    ` SELECT
        ea.joinedDateTime AS joinedDateTime,
        ea.role AS role
      FROM
          event e
      LEFT JOIN eventAttendance ea ON ea.userId = :userId AND ea.eventId = e.id
      WHERE 
        e.id IN (:eventIds)
      GROUP BY id
      `,
    { eventIds, userId }
  )
}

const setAttendeesPreviewForEvent = (
  events: DBTifEvent[],
  attendeesPreviews: DBEventAttendeesView[],
  eventsWithAttendeeCount: DBEventAttendeeCountView[],
  EventAttendanceFields: DBeventAttendance[]
) => {
  events.sort((eventA, eventB) => {
    return eventA.id.toString().localeCompare(eventB.id.toString())
  })

  for (let i = 0; i < events.length; i++) {
    events[i].previewAttendees =
      attendeesPreviews[i].userIds?.split(",").map((id) => ({
        id,
        profileImageURL: undefined
      })) ?? []
    events[i].attendeeCount = eventsWithAttendeeCount[i].attendeeCount
      ? eventsWithAttendeeCount[i].attendeeCount
      : 0
    events[i].joinedDateTime = EventAttendanceFields[i].joinedDateTime
    events[i].userAttendeeStatus =
      EventAttendanceFields[i].role ?? "not-participating"
  }
  return events
}

export const getAttendeesPreviewIds = (
  conn: MySQLExecutableDriver,
  eventIds: string[]
) => {
  return conn.queryResult<DBEventAttendeesView>(
    `
    SELECT 
      EventAttendeesView.userIds
FROM 
  EventAttendeesView
WHERE 
  EventAttendeesView.eventId IN (:eventIds)
GROUP BY 
  EventAttendeesView.eventId
HAVING 
    COUNT(DISTINCT EventAttendeesView.userIds) <= 3
  `,
    { eventIds }
  )
}

export const getAttendeeData = (
  conn: MySQLExecutableDriver,
  events: DBTifEvent[],
  userId: string
) => {
  const eventIds = events.map((event) => event.id.toString())

  if (!eventIds.length) {
    return success([])
  }

  const eventsByRegion = getAttendeesPreviewIds(conn, eventIds).flatMapSuccess(
    (attendeesPreviews) =>
      getAttendeeCount(conn, eventIds).flatMapSuccess(
        (eventsWithAttendeeCount) =>
          getAttendeeDetails(conn, userId, eventIds).mapSuccess(
            (joinTimestampAndRoleData) =>
              setAttendeesPreviewForEvent(
                events,
                attendeesPreviews,
                eventsWithAttendeeCount,
                joinTimestampAndRoleData
              )
          )
      )
  )

  return eventsByRegion
}
