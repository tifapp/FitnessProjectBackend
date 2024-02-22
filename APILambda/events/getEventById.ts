import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { DatabaseEvent } from "../shared/SQL.js"
import {
  DatabaseUserWithRelation,
  userAndRelationsWithId
} from "../user/getUser.js"
import { ValidatedRouter } from "../validation.js"
import { GetEventWhenBlockedResponse } from "./models.js"

const eventRequestSchema = z.object({
  eventId: z.string()
})

const getEventWhenBlockedResponse = (
  dbUser: DatabaseUserWithRelation,
  eventTitle: string
): GetEventWhenBlockedResponse => ({
  name: dbUser.name,
  handle: dbUser.handle,
  profileImageURL: dbUser.profileImageURL,
  title: eventTitle
})

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
      L.name,
      L.city, 
      L.country, 
      L.street, 
      L.street_num, 
      L.timeZone,
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
    LEFT JOIN 
        location L ON e.latitude = L.lat 
                  AND e.longitude = L.lon

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
      conn.transaction((tx) =>
        getEventById(conn, Number(req.params.eventId), res.locals.selfId)
          .flatMapSuccess((event) =>
            userAndRelationsWithId(
              tx,
              event.hostId,
              res.locals.selfId
            ).mapSuccess((dbUser) =>
              dbUser.themToYouStatus === "blocked" ||
              dbUser.youToThemStatus === "blocked"
                ? res
                  .status(403)
                  .json(getEventWhenBlockedResponse(dbUser, event.title))
                : res.status(200).json(event)
            )
          )
          .mapFailure((error) => res.status(404).json({ error }))
      )
  )
}
