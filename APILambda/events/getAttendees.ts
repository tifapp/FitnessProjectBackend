import { DBeventAttendance, DBuser, DBuserArrivals, MySQLExecutableDriver, UserRelationship, conn } from "TiFBackendUtils"
import { ExtractSuccess, promiseResult, success } from "TiFShared/lib/Result"
import { z } from "zod"
import { ServerEnvironment } from "../env"
import {
  decodeAttendeesListCursor,
  encodeAttendeesListCursor
} from "../shared/Cursor"
import { ValidatedRouter } from "../validation"

const AttendeesRequestSchema = z.object({
  eventId: z.string()
})

const DecodedCursorValidationSchema = z.object({
  userId: z.string(),
  joinedDateTime: z.date().nullable(),
  arrivedDateTime: z.date().nullable()
})

const CursorRequestSchema = z.object({
  nextPage: z.string().optional(),
  limit: z
    .string()
    .transform((arg) => parseInt(arg))
    .refine((arg) => arg >= 1 && arg <= 50)
})

// TODO: use index as cursor instead of userid+joindate
const getTiFAttendees = (
  conn: MySQLExecutableDriver,
  eventId: number,
  userId: string,
  nextPageUserIdCursor: string,
  nextPageJoinDateCursor: Date | null,
  nextPageArrivedDateTimeCursor: Date | null,
  limit: number
) =>
  conn.queryResult<DBeventAttendance & DBuserArrivals & UserRelationship & Pick<DBuser, "id" | "name" | "profileImageURL" | "handle"> & {hasArrived: boolean}>(
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
      nextPageUserIdCursor,
      nextPageJoinDateCursor,
      nextPageArrivedDateTimeCursor,
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

export type TiFEventAttendee = ExtractSuccess<ReturnType<typeof getTiFAttendees>>[number] // TODO: Get type from shared package schema

export type PaginatedAttendeesResponse = {
  nextPageCursor: string
  totalAttendeeCount: number
  attendees: TiFEventAttendee[]
}

const paginatedAttendeesResponse = (
  attendees: TiFEventAttendee[],
  limit: number,
  totalAttendeeCount: number
): PaginatedAttendeesResponse => {
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

const getAttendeesByEventId = (
  conn: MySQLExecutableDriver,
  eventId: number,
  userId: string,
  nextPageUserIdCursor: string,
  nextPageJoinDateCursor: Date | null,
  nextPageArrivedDateTimeCursor: Date | null,
  limit: number
) => {
  return promiseResult(
    Promise.all([
      getTiFAttendees(
        conn,
        eventId,
        userId,
        nextPageUserIdCursor,
        nextPageJoinDateCursor,
        nextPageArrivedDateTimeCursor,
        limit
      ),
      getAttendeesCount(conn, eventId, userId)
    ]).then((results) => {
      return success({
        attendees: results[0].value,
        totalAttendeeCount: results[1].value
      })
    })
  )
}
/**
 * Creates routes related to attendees list.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getAttendeesByEventIdRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  router.getWithValidation(
    "/attendees/:eventId",
    {
      pathParamsSchema: AttendeesRequestSchema,
      querySchema: CursorRequestSchema
    },
    (req, res) => {
      const { userId, joinedDateTime, arrivedDateTime } = decodeAttendeesListCursor(
        req.query.nextPage
      )

      const decodedValues = DecodedCursorValidationSchema.parse({
        userId,
        joinedDateTime,
        arrivedDateTime
      })

      return conn.transaction((tx) =>
        getAttendeesByEventId(
          tx,
          Number(req.params.eventId),
          res.locals.selfId,
          decodedValues.userId,
          decodedValues.joinedDateTime,
          decodedValues.arrivedDateTime,
          req.query.limit + 1 // Add 1 to handle checking last page
        ).mapSuccess((results) => {
          const attendees = results.attendees
          const totalAttendeeCount =
            results.totalAttendeeCount === "no-results"
              ? 0
              : results.totalAttendeeCount.totalAttendeeCount

          return totalAttendeeCount === 0
            ? res
              .status(404)
              .send(
                paginatedAttendeesResponse(
                  attendees,
                  req.query.limit,
                  totalAttendeeCount
                )
              )
            : attendees.length > 0 &&
              attendees[0].role === "hosting" &&
              attendees[0].relations.fromThemToYou === "blocked"
              ? res.status(403).send({ error: "blocked-by-host" })
              : res
                .status(200)
                .send(
                  paginatedAttendeesResponse(
                    attendees,
                    req.query.limit,
                    totalAttendeeCount
                  )
                )
        })
      )
    }
  )
}
