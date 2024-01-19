import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseAttendee, PaginatedAttendeesResponse } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"
import { decodeAttendeesListCursor } from "../shared/Cursor.js"
import { UserToProfileRelationStatus } from "../user/models.js"

const AttendeesRequestSchema = z.object({
  eventId: z.string()
})

const DecodedCursorValidationSchema = z.object({
  userId: z.string(),
  joinDate: z.date()
})

const CursorRequestSchema = z.object({
  nextPage: z.string(),
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
  limit: number
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

  return {
    nextPageCursor: JSON.stringify({
      userId: nextPageUserIdCursor,
      joinDate: nextPageJoinDateCursor
    }),
    attendeesCount: paginatedAttendees.length,
    attendees: paginatedAttendees
  }
}

// TODO: use index as cursor instead of userid+joindate
const getAttendeesByEventId = (
  conn: SQLExecutable,
  eventId: number,
  userId: string,
  nextPageUserIdCursor: string,
  nextPageJoinDateCursor: Date,
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
        joinDate: joinDate
      })

      return getAttendeesByEventId(
        conn,
        Number(req.params.eventId),
        res.locals.selfId,
        decodedValues.userId,
        decodedValues.joinDate,
        req.query.limit + 1 // Add 1 to handle checking last page
      ).mapSuccess((attendees) =>
        attendees.length === 0
          ? res
              .status(404)
              .send(paginatedAttendeesResponse(attendees, req.query.limit))
          : res
              .status(200)
              .send(paginatedAttendeesResponse(attendees, req.query.limit))
      )
    }
  )
}
