import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseEvent } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"

const eventRequestSchema = z.object({
  eventId: z.string()
})

type BlockedEvent = {
  name: string
  title: string
}

type DatabaseUserToHostRelation = {
  name: string
  themToYouStatus: string
  youToThemStatus: string
}

const getEventInfo = (
  dbUser: DatabaseUserToHostRelation,
  event: DatabaseEvent
) => {
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

const getUserToHostRelationWithId = (
  conn: SQLExecutable,
  userId: string,
  fromUserId: string
) => {
  return conn.queryFirstResult<DatabaseUserToHostRelation>(
    `
    SELECT u.name, 
    ur1.status AS themToYouStatus, 
    ur2.status AS youToThemStatus 
    FROM user u 
    LEFT JOIN userRelations ur1 ON ur1.fromUserId = u.id
    AND ur1.fromUserId = :userId
    AND ur1.toUserId = :fromUserId
    LEFT JOIN userRelations ur2 ON ur2.toUserId = u.id
    AND ur2.fromUserId = :fromUserId
    AND ur2.toUserId = :userId
    WHERE u.id = :userId;
  `,
    { userId, fromUserId }
  )
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
          return getUserToHostRelationWithId(
            conn,
            event.hostId,
            res.locals.selfId
          ).mapSuccess((dbUser) => {
            return getEventInfo(dbUser, event)
          })
        })
        .mapFailure((error) => res.status(404).json({ error }))
        .mapSuccess((event) => res.status(200).send(event))
  )
}
