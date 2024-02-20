import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { GetEventByIdEvent } from "../shared/SQL.js"
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
    .queryFirstResult<GetEventByIdEvent>(
      `
      SELECT 
        ViewEvents.*,
        ua.arrivedAt,
        CASE
          WHEN ua.userId IS NOT NULL THEN "arrived"
          ELSE "not-arrived" 
        END AS arrivalStatus
      FROM ViewEvents
      LEFT JOIN
        userArrivals ua ON ViewEvents.latitude = ua.latitude
          AND ViewEvents.longitude = ua.longitude
          AND ua.userId = :userId
      WHERE id = :eventId
      `,
      { eventId, userId } // how to handle ended events?
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
