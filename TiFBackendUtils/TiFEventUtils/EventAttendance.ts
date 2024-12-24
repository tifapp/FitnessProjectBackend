import { EventAttendee, EventID } from "TiFShared/domain-models/Event"
import {
  UnblockedUserRelationsStatus,
  UserID
} from "TiFShared/domain-models/User"
import { promiseResult, success } from "TiFShared/lib/Result"
import { DBeventAttendance, DBuser, DBuserArrivals } from "../DBTypes"
import { MySQLExecutableDriver } from "../MySQLDriver"
import { UserRelations, UserRelationsSchema } from "../TiFUserUtils"
import { Attendee, DBTifEvent } from "./TiFEventResponse"

export type DBUserAttendance = Pick<
  DBeventAttendance,
  "role" | "joinedDateTime"
> & { eventId: EventID }

const userAttendance = async (
  conn: MySQLExecutableDriver,
  userId: UserID,
  eventIds: EventID[]
) => {
  return await conn.query<DBUserAttendance>(
    `
    SELECT
      e.id AS eventId,
      ea.joinedDateTime AS joinedDateTime,
      ea.role AS role
    FROM event e
    LEFT JOIN eventAttendance ea ON ea.userId = :userId AND ea.eventId = e.id
    WHERE e.id IN (:eventIds)
    GROUP BY id
    `,
    { eventIds, userId }
  )
}

type DBEventAttendee = DBeventAttendance &
  DBuserArrivals &
  UserRelations &
  Pick<DBuser, "id" | "name" | "profileImageURL" | "handle"> & {
    hasArrived: boolean
  } & { eventId: EventID }

type AttendeeWithEventID = { eventId: EventID; attendee: EventAttendee }

const attendees = async (
  conn: MySQLExecutableDriver,
  userId: UserID,
  eventIds: EventID[]
) => {
  const attendees = await conn.query<DBEventAttendee>(
    `
    SELECT
      e.id AS eventId,
      u.id,
      u.profileImageURL,
      u.name,
      u.handle,
      ea.joinedDateTime,
      ua.arrivedDateTime,
      ea.role,
      MAX(CASE WHEN ur.fromUserId = :userId THEN ur.status END) AS fromYouToThem,
      MAX(CASE WHEN ur.toUserId = :userId THEN ur.status END) AS fromThemToYou,
      CASE WHEN ua.arrivedDateTime IS NOT NULL THEN true ELSE false END AS hasArrived
    FROM user AS u
    INNER JOIN eventAttendance AS ea ON u.id = ea.userId
    INNER JOIN event AS e ON ea.eventId = e.id
    LEFT JOIN userArrivals AS ua ON ua.userId = u.id
    LEFT JOIN userRelationships AS ur
      ON (ur.fromUserId = u.id AND ur.toUserId = :userId) OR (ur.fromUserId = :userId AND ur.toUserId = u.id)
    WHERE e.id IN (:eventIds)
      AND (ua.longitude = e.longitude AND ua.latitude = e.latitude OR ua.arrivedDateTime IS NULL)
    GROUP BY eventId, u.id, ua.arrivedDateTime
    ORDER BY ea.joinedDateTime ASC
  `,
    { eventIds, userId }
  )
  return attendees.map(
    (attendee) =>
      ({
        eventId: attendee.eventId,
        attendee: {
          id: attendee.id,
          name: attendee.name,
          joinedDateTime: attendee.joinedDateTime,
          profileImageURL: attendee.profileImageURL,
          handle: attendee.handle,
          arrivedDateTime: attendee.arrivedDateTime,
          hasArrived: !!attendee.hasArrived,
          role: attendee.role,
          relationStatus: UserRelationsSchema.parse({
            fromYouToThem: attendee.fromYouToThem ?? "not-friends",
            fromThemToYou: attendee.fromThemToYou ?? "not-friends"
          }) as UnblockedUserRelationsStatus
        }
      } as AttendeeWithEventID)
  )
}

const attendance = async (
  conn: MySQLExecutableDriver,
  eventIds: EventID[],
  userId: UserID
) => {
  if (eventIds.length === 0) {
    return success([[], []] as [AttendeeWithEventID[], DBUserAttendance[]])
  }
  const attendance = await Promise.all([
    attendees(conn, userId, eventIds),
    userAttendance(conn, userId, eventIds)
  ])
  return success(attendance)
}

const addAttendance = (
  events: DBTifEvent[],
  attendees: AttendeeWithEventID[],
  userAttendances: DBUserAttendance[]
) => {
  const map = new Map<EventID, DBTifEvent>(
    events.map((e) => [
      e.id,
      {
        ...e,
        attendeeCount: 0,
        previewAttendees: [],
        userAttendeeStatus: "not-participating"
      }
    ])
  )
  attendees.forEach(
    ({ attendee, eventId }: { attendee: Attendee; eventId: EventID }) => {
      const event = map.get(eventId)
      if (!event) return
      event.previewAttendees.push(attendee)
      event.attendeeCount++
    }
  )
  userAttendances.forEach(({ eventId, ...attendance }) => {
    const event = map.get(eventId)
    if (!event) return
    event.joinedDateTime = attendance.joinedDateTime
    event.userAttendeeStatus = attendance.role ?? "not-participating"
  })
  return Array.from(map.values())
}

export const addAttendanceData = (
  conn: MySQLExecutableDriver,
  events: DBTifEvent[],
  userId: UserID
) => {
  const eventIds = events.map((event) => event.id)
  return promiseResult(attendance(conn, eventIds, userId)).mapSuccess(
    ([attendees, userAttendances]) => {
      return addAttendance(events, attendees, userAttendances)
    }
  )
}
