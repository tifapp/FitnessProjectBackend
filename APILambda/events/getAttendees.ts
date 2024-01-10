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
  conn
    .queryResults<DatabaseAttendee>(
      `SELECT 
        U.id, 
        U.profileImageURL, 
        U.name, 
        U.handle, 
        EA.joinTimestamp,
        MAX(CASE WHEN UR.fromUserId = :userId THEN UR.status END) AS youToThemStatus,
        MAX(CASE WHEN UR.toUserId = :userId THEN UR.status END) AS themToYouStatus
        FROM user AS U 
        INNER JOIN eventAttendance AS EA ON U.id = EA.userId 
        INNER JOIN event AS E ON EA.eventId = E.id
        LEFT JOIN userArrivals AS UA ON UA.userId = U.id
        LEFT JOIN userRelations AS UR ON (UR.fromUserId = U.id AND UR.toUserId = :userId)
                                    OR (UR.fromUserId = :userId AND UR.toUserId = U.id)
        WHERE E.id = :eventId
        AND (:nextPageUserId IS NULL OR (:nextPageUserId, :nextPageJoinDate) < (U.id, EA.joinTimestamp))
        AND (UA.longitude = E.longitude AND UA.latitude = E.latitude
            OR UA.arrivedAt IS NULL)
        GROUP BY U.id
        ORDER BY U.id ASC, EA.joinTimestamp ASC
        LIMIT :limit;
  `,
      { eventId, userId, nextPageUserId, nextPageJoinDate, limit }
    )
    .withFailure("attendees-not-found" as const)

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
      )
        .mapFailure((error) => res.status(404).json({ error }))
        .mapSuccess((attendees) => {
          return res
            .status(200)
            .send(attendeesPaginatedResponse(attendees, req.query.limit))
        })
    }
  )
}
