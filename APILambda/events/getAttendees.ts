import { conn, DBeventAttendance, DBuser, DBuserArrivals, MySQLExecutableDriver } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { EventAttendee, EventAttendeesPage } from "TiFShared/domain-models/Event.js"
import { BidirectionalUserRelations } from "TiFShared/domain-models/User.js"
import { failure, success } from "TiFShared/lib/Result.js"
import { z } from "zod"
import { TiFAPIRouter } from "../router.js"
import {
  AttendeesListCursor,
  decodeAttendeesListCursor,
  encodeAttendeesListCursor
} from "../utils/Cursor.js"

const DecodedCursorValidationSchema = z.object({
  userIdCursor: z.string(),
  joinedDateTimeCursor: z.date().nullable(),
  arrivedDateTimeCursor: z.date().nullable()
})

// TODO: use index as cursor instead of userid+joindate
const getTiFAttendeesSQL = (
  conn: MySQLExecutableDriver,
  eventId: number,
  userId: string,
  { userIdCursor, joinedDateTimeCursor, arrivedDateTimeCursor }: AttendeesListCursor,
  limit: number
) =>
  conn.queryResult<DBeventAttendance & DBuserArrivals & BidirectionalUserRelations & Pick<DBuser, "id" | "name" | "profileImageURL" | "handle"> & {hasArrived: boolean}>(
    `SELECT 
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
    LEFT JOIN userRelations AS ur ON (ur.fromUserId = u.id AND ur.toUserId = :userId)
                                OR (ur.fromUserId = :userId AND ur.toUserId = u.id)
    WHERE e.id = :eventId
    AND (:nextPageUserIdCursor = 'firstPage' 
      OR (ua.arrivedDateTime > :nextPageArrivedDateTimeCursor OR (ua.arrivedDateTime IS NULL AND :nextPageArrivedDateTimeCursor IS NOT NULL))
        OR (ua.arrivedDateTime IS NULL AND :nextPageArrivedDateTimeCursor IS NULL AND ea.joinedDateTime > :nextPageJoinDateCursor)
        OR (ua.arrivedDateTime IS NULL AND :nextPageArrivedDateTimeCursor IS NULL AND ea.joinedDateTime = :nextPageJoinDateCursor AND u.id > :nextPageUserIdCursor)
      )
    AND (ea.role <> 'hosting' OR :nextPageUserIdCursor = 'firstPage')
    AND (ua.longitude = e.longitude AND ua.latitude = e.latitude
      OR ua.arrivedDateTime IS NULL)
    GROUP BY u.id, ua.arrivedDateTime
    HAVING fromThemToYou IS NULL OR MAX(CASE WHEN ur.toUserId = :userId THEN ur.status END) <> 'blocked' OR ea.role = 'hosting'
    ORDER BY
    CASE WHEN :nextPageUserIdCursor = 'firstPage' THEN CASE WHEN ea.role = 'hosting' THEN 0 ELSE 1 END ELSE 1 END,
    COALESCE(ua.arrivedDateTime, '9999-12-31 23:59:59.999') ASC,
    ea.joinedDateTime ASC,
    u.id ASC
    LIMIT :limit;
  `,
    {
      eventId,
      userId,
      userIdCursor,
      joinedDateTimeCursor,
      arrivedDateTimeCursor,
      limit
    }
  ).mapSuccess((attendees) => attendees.map((attendee) => ({
    id: attendee.id,
    name: attendee.name,
    joinedDateTime: attendee.joinedDateTime,
    profileImageURL: attendee.profileImageURL,
    handle: attendee.handle,
    arrivedDateTime: attendee.arrivedDateTime,
    hasArrived: !!attendee.hasArrived,
    role: attendee.role,
    relations: {
      fromYouToThem: attendee.fromYouToThem ?? "not-friends",
      fromThemToYou: attendee.fromThemToYou ?? "not-friends"
    }
  })))

const paginatedAttendeesResponse = (
  attendees: EventAttendee[],
  limit: number,
  totalAttendeeCount: number
): EventAttendeesPage => {
  const hasMoreAttendees = attendees.length > limit

  const nextPageUserIdCursor = hasMoreAttendees
    ? attendees[limit - 1].id
    : "lastPage"
  const nextPageJoinDateCursor = hasMoreAttendees
    ? attendees[limit - 1].joinedDateTime
    : null
  const nextPageArrivedDateTimeCursor = hasMoreAttendees
    ? attendees[limit - 1].arrivedDateTime
    : null

  let paginatedAttendees = []
  paginatedAttendees = attendees.slice(0, limit)

  const encondedNextPageCursor = encodeAttendeesListCursor({
    userId: nextPageUserIdCursor,
    joinedDateTime: nextPageJoinDateCursor,
    arrivedDateTime: nextPageArrivedDateTimeCursor
  })

  return {
    nextPageCursor: encondedNextPageCursor,
    totalAttendeeCount,
    attendees: paginatedAttendees
  }
}

const getAttendeesCount = (
  conn: MySQLExecutableDriver,
  eventId: number,
  userId: string
) =>
  conn.queryFirstResult<{ totalAttendeeCount: number }>(
    `SELECT 
      COUNT(*) AS totalAttendeeCount
      FROM 
          user AS u 
          INNER JOIN eventAttendance AS ea ON u.id = ea.userId 
          INNER JOIN event AS e ON ea.eventId = e.id
          LEFT JOIN userRelations AS fromThemToYou ON fromThemToYou.fromUserId = u.id AND fromThemToYou.toUserId = :userId
          LEFT JOIN userRelations AS fromYouToThem ON fromYouToThem.fromUserId = :userId AND fromYouToThem.toUserId = u.id
      WHERE 
          e.id = :eventId
          AND (
              (fromThemToYou.status IS NULL OR (fromThemToYou.status != 'blocked' AND fromThemToYou.toUserId = :userId))
          );
    `,
    { eventId, userId }
  )
    .mapSuccess(({ totalAttendeeCount }) => totalAttendeeCount)

/**
 * Creates routes related to attendees list.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const attendeesList: TiFAPIRouter["attendeesList"] = ({ query: { nextPage, limit }, params: { eventId }, context: { selfId } }) => {
  const cursor = DecodedCursorValidationSchema.parse(decodeAttendeesListCursor(
    nextPage
  ))

  return conn.transaction((tx) =>
    getAttendeesCount(tx, eventId, selfId)
      .withFailure(resp(404, { error: "no-attendees" }))
      .flatMapSuccess(totalAttendeeCount =>
        getTiFAttendeesSQL(
          tx,
          eventId,
          selfId,
          cursor,
          limit + 1 // Add 1 to handle checking last page
        )
          .passthroughSuccess((attendees) =>
            attendees.length > 0 &&
          attendees[0].role === "hosting" &&
          attendees[0].relations.fromThemToYou === "blocked"
              ? failure(resp(403, { error: "blocked-by-host" }))
              : success()
          )
          .mapSuccess((attendees) =>
            resp(200,
              paginatedAttendeesResponse(
                // TODO: Handle blocked relations
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                attendees as any,
                limit,
                totalAttendeeCount
              )
            )
          )
      ))
    .unwrap()
}
