import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseAttendee } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"

const AttendeesRequestSchema = z.object({
  eventId: z.string()
})

const CursorRequestSchema = z.object({
  nextPage: z.string(),
  limit: z
    .string()
    .transform((arg) => parseInt(arg))
    .refine((arg) => arg >= 1 && arg <= 50)
})

const attendeesPaginatedResponse = (attendees: DatabaseAttendee[]) => ({
  nextPageUserId:
    attendees.length > 0 ? attendees[attendees.length - 1].id : null,
  nextPageJoinDate:
    attendees.length > 0 ? attendees[attendees.length - 1].joinTimestamp : null,
  attendees: attendees
})

const getAttendeesByEventId = (
  conn: SQLExecutable,
  eventId: number,
  userId: string,
  nextPageuserId: string,
  nextPageJoinDate: string,
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
        AND (:nextPageuserId, :nextPageJoinDate) < (U.id, EA.joinTimestamp) 
        AND (UA.longitude = E.longitude AND UA.latitude = E.latitude
            OR UA.arrivedAt IS NULL)
        GROUP BY U.id
        ORDER BY U.id ASC, EA.joinTimestamp ASC
        LIMIT :limit;
  `,
      { eventId, userId, nextPageuserId, nextPageJoinDate, limit }
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
    (req, res) =>
      getAttendeesByEventId(
        conn,
        Number(req.params.eventId),
        res.locals.selfId,
        req.query.nextPage.split("_")[1],
        req.query.nextPage.split("_")[3],
        req.query.limit
      )
        .mapFailure((error) => res.status(404).json({ error }))
        .mapSuccess((attendees) => {
          return res.status(200).send(attendeesPaginatedResponse(attendees))
        })
  )
}
