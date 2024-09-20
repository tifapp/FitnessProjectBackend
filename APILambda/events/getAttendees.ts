import { conn } from "TiFBackendUtils"
import { DBeventAttendance, DBuser, DBuserArrivals } from "TiFBackendUtils/DBTypes"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { EventAttendee, EventAttendeesPage } from "TiFShared/domain-models/Event"
import { BidirectionalUserRelations } from "TiFShared/domain-models/User"
import { failure, success } from "TiFShared/lib/Result"
import { z } from "zod"
import { TiFAPIRouterExtension } from "../router"
import {
  AttendeesListCursor,
  decodeAttendeesListCursor,
  encodeAttendeesListCursor
} from "../utils/Cursor"

const DecodedCursorValidationSchema = z.object({
  userId: z.string(),
  joinedDateTime: z.date().optional(),
  arrivedDateTime: z.date().optional()
})

// TODO: use index as cursor instead of userid+joindate
const getTiFAttendeesSQL = (
  conn: MySQLExecutableDriver,
  eventId: number,
  userId: string,
  { userId: nextPageUserId, joinedDateTime: nextPageJoinDateTime, arrivedDateTime: nextPageArrivedDateTime }: AttendeesListCursor,
  limit: number
) => conn.queryResult<DBeventAttendance & DBuserArrivals & BidirectionalUserRelations & Pick<DBuser, "id" | "name" | "profileImageURL" | "handle"> & {hasArrived: boolean}>(
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
    AND (:nextPageUserId = 'firstPage' 
      OR (ua.arrivedDateTime > :nextPageArrivedDateTime OR (ua.arrivedDateTime IS NULL AND :nextPageArrivedDateTime IS NOT NULL))
        OR (ua.arrivedDateTime IS NULL AND :nextPageArrivedDateTime IS NULL AND ea.joinedDateTime > :nextPageJoinDateTime)
        OR (ua.arrivedDateTime IS NULL AND :nextPageArrivedDateTime IS NULL AND ea.joinedDateTime = :nextPageJoinDateTime AND u.id > :nextPageUserId)
      )
    AND (ea.role <> 'hosting' OR :nextPageUserId = 'firstPage')
    AND (ua.longitude = e.longitude AND ua.latitude = e.latitude
      OR ua.arrivedDateTime IS NULL)
    GROUP BY u.id, ua.arrivedDateTime
    HAVING fromThemToYou IS NULL OR MAX(CASE WHEN ur.toUserId = :userId THEN ur.status END) <> 'blocked' OR ea.role = 'hosting'
    ORDER BY
    CASE WHEN :nextPageUserId = 'firstPage' THEN CASE WHEN ea.role = 'hosting' THEN 0 ELSE 1 END ELSE 1 END,
    COALESCE(ua.arrivedDateTime, '9999-12-31 23:59:59.999') ASC,
    ea.joinedDateTime ASC,
    u.id ASC
    LIMIT :limit;
  `,
  {
    eventId,
    userId,
    nextPageUserId,
    nextPageJoinDateTime,
    nextPageArrivedDateTime,
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

  let paginatedAttendees = []
  paginatedAttendees = attendees.slice(0, limit)

  const encondedNextPageCursor = encodeAttendeesListCursor({
    userId: hasMoreAttendees
      ? attendees[limit - 1].id
      : "lastPage",
    joinedDateTime: hasMoreAttendees
      ? attendees[limit - 1].joinedDateTime
      : undefined,
    arrivedDateTime: hasMoreAttendees
      ? attendees[limit - 1].arrivedDateTime
      : undefined
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
        COUNT(u.id) AS totalAttendeeCount
    FROM 
        user AS u 
        INNER JOIN eventAttendance AS ea ON u.id = ea.userId 
        LEFT JOIN event AS e ON ea.eventId = e.id AND e.id = :eventId
        LEFT JOIN userRelations AS fromThemToYou ON fromThemToYou.fromUserId = u.id AND fromThemToYou.toUserId = :userId
        LEFT JOIN userRelations AS fromYouToThem ON fromYouToThem.fromUserId = :userId AND fromYouToThem.toUserId = u.id
    WHERE 
        e.id IS NOT NULL  -- Ensures only rows where the event exists are returned
        AND (fromThemToYou.status IS NULL OR (fromThemToYou.status != 'blocked' AND fromThemToYou.toUserId = :userId))
    GROUP BY 
        e.id;
    `,
    { eventId, userId }
  )

const checkEventExists = (
  conn: MySQLExecutableDriver,
  eventId: number
) =>
  conn.queryHasResults(
    `SELECT *
    FROM event
    WHERE id = :eventId
    `,
    { eventId }
  )

/**
 * Creates routes related to attendees list.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const attendeesList: TiFAPIRouterExtension["attendeesList"] = ({ query: { nextPageCursor, limit }, params: { eventId }, context: { selfId }, log }) => {
  const cursor = DecodedCursorValidationSchema.parse(decodeAttendeesListCursor(
    nextPageCursor
  ))

  log.debug("decoded attendees cursor is ", cursor)

  return conn.transaction((tx) =>
    checkEventExists(tx, eventId)
      .withFailure(resp(404, { error: "event-not-found" }))
      .flatMapSuccess(() =>
        getAttendeesCount(tx, eventId, selfId)
          .withFailure(resp(404, { error: "no-attendees" }))
      )
      .flatMapSuccess(({ totalAttendeeCount }) =>
        getTiFAttendeesSQL(
          tx,
          eventId,
          selfId,
          cursor as AttendeesListCursor, // weird: fails typescript compiling without explicit cast
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
