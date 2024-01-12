import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseAttendee } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"
import { decodeCursor } from "../shared/Cursor.js"

const AttendeesRequestSchema = z.object({
  eventId: z.string()
})

const DecodedCursorRequestSchema = z.object({
  userId: z.string().nullable(),
  joinDate: z.date()
})

const CursorRequestSchema = z.object({
  nextPage: z.string(),
  limit: z
    .string()
    .transform((arg) => parseInt(arg))
    .refine((arg) => arg >= 1 && arg <= 50)
})

const attendeesPaginatedResponse = (
  attendees: DatabaseAttendee[],
  limit: number
) => {
  const hasMoreAttendees = attendees.length > limit

  const nextPageUserId = hasMoreAttendees ? attendees[limit - 1].id : null
  const nextPageJoinDate = hasMoreAttendees
    ? attendees[limit - 1].joinTimestamp
    : null

  const paginatedAttendees = attendees.slice(0, limit)

  return {
    nextPageUserId,
    nextPageJoinDate,
    attendees: paginatedAttendees
  }
}

const getAttendeesByEventId = (
  conn: SQLExecutable,
  eventId: number,
  userId: string,
  nextPageUserId: string | null,
  nextPageJoinDate: Date,
  limit: number
) =>
  conn.queryResults<DatabaseAttendee>(
    `SELECT 
        u.id, 
        u.profileImageURL, 
        u.name, 
        u.handle, 
        ea.joinTimestamp,
        MAX(CASE WHEN ur.fromUserId = :userId THEN ur.status END) AS youToThemStatus,
        MAX(CASE WHEN ur.toUserId = :userId THEN ur.status END) AS themToYouStatus
        FROM user AS u 
        INNER JOIN eventAttendance AS ea ON u.id = ea.userId 
        INNER JOIN event AS e ON ea.eventId = e.id
        LEFT JOIN userArrivals AS ua ON ua.userId = u.id
        LEFT JOIN userRelations AS ur ON (ur.fromUserId = u.id AND ur.toUserId = :userId)
                                    OR (ur.fromUserId = :userId AND ur.toUserId = u.id)
        WHERE e.id = :eventId
        AND (:nextPageUserId IS NULL OR (:nextPageUserId, :nextPageJoinDate) < (u.id, ea.joinTimestamp))
        AND (ua.longitude = e.longitude AND ua.latitude = e.latitude
            OR ua.arrivedAt IS NULL)
        GROUP BY u.id
        ORDER BY u.id ASC, ea.joinTimestamp ASC
        LIMIT :limit;
  `,
    { eventId, userId, nextPageUserId, nextPageJoinDate, limit }
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
      const { userId, joinDate } = decodeCursor(req.query.nextPage)

      const decodedValues = DecodedCursorRequestSchema.parse({
        userId,
        joinDate: joinDate
      })

      const { userId: validatedUserId, joinDate: validatedJoinDate } =
        decodedValues
      const validatedUserIdNullCheck =
        userId === "null" ? null : validatedUserId

      return getAttendeesByEventId(
        conn,
        Number(req.params.eventId),
        res.locals.selfId,
        validatedUserIdNullCheck,
        validatedJoinDate,
        req.query.limit + 1 // Add 1 to handle checking last page
      ).mapSuccess((attendees) =>
        attendees.length === 0
          ? res.status(404).send(attendees)
          : res
              .status(200)
              .send(attendeesPaginatedResponse(attendees, req.query.limit))
      )
    }
  )
}
