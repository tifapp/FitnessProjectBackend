import { SQLExecutable, conn, promiseResult, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import {
  decodeAttendeesListCursor,
  encodeAttendeesListCursor
} from "../shared/Cursor.js"
import { DatabaseAttendee, PaginatedAttendeesResponse } from "../shared/SQL.js"
import { UserToProfileRelationStatus } from "../user/models.js"
import { ValidatedRouter } from "../validation.js"

const AttendeesRequestSchema = z.object({
  eventId: z.string()
})

const DecodedCursorValidationSchema = z.object({
  userId: z.string(),
  joinDate: z.date().nullable(),
  arrivedAt: z.date().nullable()
})

const CursorRequestSchema = z.object({
  nextPage: z.string().optional(),
  limit: z
    .string()
    .transform((arg) => parseInt(arg))
    .refine((arg) => arg >= 1 && arg <= 50)
})

type DatabaseAttendeeWithRelation = DatabaseAttendee & {
  themToYou: UserToProfileRelationStatus
  youToThem: UserToProfileRelationStatus
}

const mapDatabaseAttendee = (sqlResult: DatabaseAttendeeWithRelation) => {
  return {
    id: sqlResult.id,
    name: sqlResult.name,
    joinTimestamp: sqlResult.joinTimestamp,
    profileImageURL: sqlResult.profileImageURL,
    handle: sqlResult.handle,
    arrivedAt: sqlResult.arrivedAt,
    arrivalStatus: !!sqlResult.arrivalStatus,
    role: sqlResult.role,
    relations: {
      youToThem: sqlResult.youToThem ?? "not-friends",
      themToYou: sqlResult.themToYou ?? "not-friends"
    }
  }
}

const paginatedAttendeesResponse = (
  attendees: DatabaseAttendeeWithRelation[],
  limit: number,
  totalAttendeeCount: number
): PaginatedAttendeesResponse => {
  const mappedAttendees = attendees.map(mapDatabaseAttendee)

  const hasMoreAttendees = mappedAttendees.length > limit

  const nextPageUserIdCursor = hasMoreAttendees
    ? mappedAttendees[limit - 1].id
    : "lastPage"
  const nextPageJoinDateCursor = hasMoreAttendees
    ? mappedAttendees[limit - 1].joinTimestamp
    : null
  const nextPageArrivedAtCursor = hasMoreAttendees
    ? mappedAttendees[limit - 1].arrivedAt
    : null

  let paginatedAttendees = []
  paginatedAttendees = mappedAttendees.slice(0, limit)

  const encondedNextPageCursor = encodeAttendeesListCursor({
    userId: nextPageUserIdCursor,
    joinDate: nextPageJoinDateCursor,
    arrivedAt: nextPageArrivedAtCursor
  })

  return {
    nextPageCursor: encondedNextPageCursor,
    totalAttendeeCount,
    attendees: paginatedAttendees
  }
}

const getAttendeesCount = (
  conn: SQLExecutable,
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
          LEFT JOIN userRelations AS themToYouStatus ON themToYouStatus.fromUserId = u.id AND themToYouStatus.toUserId = :userId
          LEFT JOIN userRelations AS youToThemStatus ON youToThemStatus.fromUserId = :userId AND youToThemStatus.toUserId = u.id
      WHERE 
          e.id = :eventId
          AND (
              (themToYouStatus.status IS NULL OR (themToYouStatus.status != 'blocked' AND themToYouStatus.toUserId = :userId))
          );
    `,
    { eventId, userId }
  )

// TODO: use index as cursor instead of userid+joindate
const getAttendees = (
  conn: SQLExecutable,
  eventId: number,
  userId: string,
  nextPageUserIdCursor: string,
  nextPageJoinDateCursor: Date | null,
  nextPageArrivedAtCursor: Date | null,
  limit: number
) =>
  conn.queryResults<DatabaseAttendeeWithRelation>(
    `SELECT 
    u.id, 
    u.profileImageURL, 
    u.name, 
    u.handle, 
    ea.joinTimestamp,
    ua.arrivedAt,
    ea.role,
    MAX(CASE WHEN ur.fromUserId = :userId THEN ur.status END) AS youToThem,
    MAX(CASE WHEN ur.toUserId = :userId THEN ur.status END) AS themToYou,
    CASE WHEN ua.arrivedAt IS NOT NULL THEN true ELSE false END AS arrivalStatus
    FROM user AS u 
    INNER JOIN eventAttendance AS ea ON u.id = ea.userId 
    INNER JOIN event AS e ON ea.eventId = e.id
    LEFT JOIN userArrivals AS ua ON ua.userId = u.id
    LEFT JOIN userRelations AS ur ON (ur.fromUserId = u.id AND ur.toUserId = :userId)
                                OR (ur.fromUserId = :userId AND ur.toUserId = u.id)
    WHERE e.id = :eventId
    AND (:nextPageUserIdCursor = 'firstPage' 
      OR (ua.arrivedAt > :nextPageArrivedAtCursor OR (ua.arrivedAt IS NULL AND :nextPageArrivedAtCursor IS NOT NULL))
        OR (ua.arrivedAt IS NULL AND :nextPageArrivedAtCursor IS NULL AND ea.joinTimestamp > :nextPageJoinDateCursor)
        OR (ua.arrivedAt IS NULL AND :nextPageArrivedAtCursor IS NULL AND ea.joinTimestamp = :nextPageJoinDateCursor AND u.id > :nextPageUserIdCursor)
      )
    AND (ea.role <> 'host' OR :nextPageUserIdCursor = 'firstPage')
    AND (ua.longitude = e.longitude AND ua.latitude = e.latitude
      OR ua.arrivedAt IS NULL)
    GROUP BY u.id, ua.arrivedAt
    HAVING themToYou IS NULL OR MAX(CASE WHEN ur.toUserId = :userId THEN ur.status END) <> 'blocked' OR ea.role = 'host'
    ORDER BY
    CASE WHEN :nextPageUserIdCursor = 'firstPage' THEN CASE WHEN ea.role = 'host' THEN 0 ELSE 1 END ELSE 1 END,
    COALESCE(ua.arrivedAt, '9999-12-31 23:59:59.999') ASC,
    ea.joinTimestamp ASC,
    u.id ASC
    LIMIT :limit;
  `,
    {
      eventId,
      userId,
      nextPageUserIdCursor,
      nextPageJoinDateCursor,
      nextPageArrivedAtCursor,
      limit
    }
  )

const getAttendeesByEventId = (
  conn: SQLExecutable,
  eventId: number,
  userId: string,
  nextPageUserIdCursor: string,
  nextPageJoinDateCursor: Date | null,
  nextPageArrivedAtCursor: Date | null,
  limit: number
) => {
  return promiseResult(
    Promise.all([
      getAttendees(
        conn,
        eventId,
        userId,
        nextPageUserIdCursor,
        nextPageJoinDateCursor,
        nextPageArrivedAtCursor,
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
      const { userId, joinDate, arrivedAt } = decodeAttendeesListCursor(
        req.query.nextPage
      )

      const decodedValues = DecodedCursorValidationSchema.parse({
        userId,
        joinDate,
        arrivedAt
      })

      return conn.transaction((tx) =>
        getAttendeesByEventId(
          tx,
          Number(req.params.eventId),
          res.locals.selfId,
          decodedValues.userId,
          decodedValues.joinDate,
          decodedValues.arrivedAt,
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
              attendees[0].role === "host" &&
              attendees[0].themToYou === "blocked"
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
