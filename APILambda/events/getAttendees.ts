import { SQLExecutable, conn, promiseResult } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseAttendee, PaginatedAttendeesResponse } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"
import {
  decodeAttendeesListCursor,
  encodeAttendeesListCursor
} from "../shared/Cursor.js"
import { UserToProfileRelationStatus } from "../user/models.js"
import { success } from "TiFBackendUtils"

const AttendeesRequestSchema = z.object({
  eventId: z.string()
})

const DecodedCursorValidationSchema = z.object({
  userId: z.string(),
  joinDate: z.date().nullable()
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
    relations: {
      youToThem: sqlResult.youToThem ?? "not-friends",
      themToYou: sqlResult.themToYou ?? "not-friends"
    }
  }
}

const paginatedAttendeesResponse = (
  attendees: DatabaseAttendeeWithRelation[],
  limit: number,
  totalAttendeesCount: number
): PaginatedAttendeesResponse => {
  const mappedAttendees = attendees.map(mapDatabaseAttendee)

  const hasMoreAttendees = mappedAttendees.length > limit

  const nextPageUserIdCursor = hasMoreAttendees
    ? mappedAttendees[limit - 1].id
    : "lastPage"
  const nextPageJoinDateCursor = hasMoreAttendees
    ? mappedAttendees[limit - 1].joinTimestamp
    : null

  const paginatedAttendees = mappedAttendees.slice(0, limit)
  const encondedNextPageCursor = encodeAttendeesListCursor({
    userId: nextPageUserIdCursor,
    joinDate: nextPageJoinDateCursor
  })

  return {
    nextPageCursor: encondedNextPageCursor,
    attendeesCount: totalAttendeesCount,
    attendees: paginatedAttendees
  }
}

const getAttendeesCount = (
  conn: SQLExecutable,
  eventId: number,
  userId: string
) =>
  conn.queryFirstResult<{ totalAttendeesCount: number }>(
    `SELECT 
      COUNT(*) AS totalAttendeesCount
      FROM 
          user AS u 
          INNER JOIN eventAttendance AS ea ON u.id = ea.userId 
          INNER JOIN event AS e ON ea.eventId = e.id
          LEFT JOIN userRelations AS ur ON (ur.fromUserId = u.id AND ur.toUserId = :userId)
                                      OR (ur.fromUserId = :userId AND ur.toUserId = u.id)
      WHERE 
          e.id = :eventId
          AND (
              ur.status IS NULL 
              OR (ur.status != 'blocked' AND ur.toUserId = :userId)
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
  limit: number
) =>
  conn.queryResults<DatabaseAttendeeWithRelation>(
    `SELECT 
        u.id, 
        u.profileImageURL, 
        u.name, 
        u.handle, 
        ea.joinTimestamp,
        MAX(CASE WHEN ur.fromUserId = :userId THEN ur.status END) AS youToThem,
        MAX(CASE WHEN ur.toUserId = :userId THEN ur.status END) AS themToYou
        FROM user AS u 
        INNER JOIN eventAttendance AS ea ON u.id = ea.userId 
        INNER JOIN event AS e ON ea.eventId = e.id
        LEFT JOIN userRelations AS ur ON (ur.fromUserId = u.id AND ur.toUserId = :userId)
                                    OR (ur.fromUserId = :userId AND ur.toUserId = u.id)
        WHERE e.id = :eventId
        AND (:nextPageUserIdCursor = 'firstPage' OR (:nextPageUserIdCursor, :nextPageJoinDateCursor) < (u.id, ea.joinTimestamp))
        GROUP BY u.id
        ORDER BY u.id ASC, ea.joinTimestamp ASC
        LIMIT :limit;
  `,
    { eventId, userId, nextPageUserIdCursor, nextPageJoinDateCursor, limit }
  )

const getAttendeesByEventId = (
  conn: SQLExecutable,
  eventId: number,
  userId: string,
  nextPageUserIdCursor: string,
  nextPageJoinDateCursor: Date | null,
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
        limit
      ),
      getAttendeesCount(conn, eventId, userId)
    ]).then((results) => {
      return success({
        attendees: results[0].value,
        totalAttendeesCount: results[1].value
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
      const { userId, joinDate } = decodeAttendeesListCursor(req.query.nextPage)

      const decodedValues = DecodedCursorValidationSchema.parse({
        userId,
        joinDate
      })

      return conn.transaction((tx) =>
        getAttendeesByEventId(
          tx,
          Number(req.params.eventId),
          res.locals.selfId,
          decodedValues.userId,
          decodedValues.joinDate,
          req.query.limit + 1 // Add 1 to handle checking last page
        ).mapSuccess((results) => {
          const attendees = results.attendees
          const attendeesCount =
            results.totalAttendeesCount === "no-results"
              ? 0
              : results.totalAttendeesCount.totalAttendeesCount

          return attendeesCount === 0
            ? res
                .status(404)
                .send(
                  paginatedAttendeesResponse(
                    attendees,
                    req.query.limit,
                    attendeesCount
                  )
                )
            : res
                .status(200)
                .send(
                  paginatedAttendeesResponse(
                    attendees,
                    req.query.limit,
                    attendeesCount
                  )
                )
        })
      )
    }
  )
}
