import { SQLExecutable, conn, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseEvent } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"
import { userAndRelationsWithId } from "../user/getUser.js"
import { DatabaseUser, UserToProfileRelationStatus } from "../user/models.js"

const eventRequestSchema = z.object({
  eventId: z.string()
})

type BlockedEvent = {
  name: string
  title: string
}

type DatabaseUserWithRelation = DatabaseUser & {
  themToYouStatus: UserToProfileRelationStatus | null
  youToThemStatus: UserToProfileRelationStatus | null
}

const getEventInfo = (
  dbUser: DatabaseUserWithRelation,
  event: DatabaseEvent
): DatabaseEvent | BlockedEvent => {
  if (
    dbUser.themToYouStatus === "blocked" ||
    dbUser.youToThemStatus === "blocked"
  ) {
    const blockedEvent: BlockedEvent = {
      name: dbUser.name,
      title: event.title
    }
    return blockedEvent
  }
  return event
}

export const getEventById = (
  conn: SQLExecutable,
  eventId: number,
  userId: string
) =>
  conn
    .queryFirstResult<DatabaseEvent>(
      `
    SELECT 
      e.*, 
      ua.arrivedAt,
      CASE 
        WHEN ua.userId IS NOT NULL THEN "arrived"
        ELSE "not-arrived"
      END AS arrivalStatus
    FROM 
        event e
    LEFT JOIN 
        userArrivals ua ON e.latitude = ua.latitude 
                        AND e.longitude = ua.longitude 
                        AND ua.userId = :userId
    WHERE 
        e.id = :eventId;
  `,
      { eventId, userId }
    )
    .withFailure("event-not-found" as const)

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getEventByIdRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  router.getWithValidation(
    "/details/:eventId",
    { pathParamsSchema: eventRequestSchema },
    (req, res) =>
      getEventById(conn, Number(req.params.eventId), res.locals.selfId)
        .flatMapSuccess((event) => {
          const hostId = event.hostId
          return userAndRelationsWithId(
            conn,
            hostId,
            res.locals.selfId
          ).mapSuccess((dbUser) => {
            return getEventInfo(dbUser, event)
          })
        })
        .mapFailure((error) => res.status(404).json({ error }))
        .mapSuccess((event) => res.status(200).send(event))
  )
}
