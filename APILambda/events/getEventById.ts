import { DBTifEvent, SQLExecutable, conn, refactorEventsToMatchTifEvent, setEventAttendeesFields, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
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
  eventTitle: string,
  eventId: number
): GetEventWhenBlockedResponse => ({
  title: eventTitle,
  id: eventId,
  host: {
    username: dbUser.name,
    id: dbUser.id,
    handle: dbUser.handle,
    profileImageURL: dbUser.profileImageURL,
    relations: {
      themToYou: dbUser.themToYouStatus,
      youToThem: dbUser.youToThemStatus
    }
  },
  createdAt: dbUser.creationDate,
  updatedAt: dbUser.updatedAt
})

export const getEventById = (
  conn: SQLExecutable,
  eventId: number,
  userId: string
) =>
  conn
    .queryFirstResult<DBTifEvent>(
      `
      SELECT TifEventView.*,
       CASE
           WHEN TifEventView.hostId = :userId THEN 'current-user'
           ELSE CASE
                    WHEN UserRelationOfHostToUser.status IS NULL THEN 'not-friends'
                    ELSE UserRelationOfHostToUser.status
                END
       END AS themToYou,
       CASE
           WHEN TifEventView.hostId = :userId THEN 'current-user'
           ELSE CASE
                    WHEN UserRelationOfUserToHost.status IS NULL THEN 'not-friends'
                    ELSE UserRelationOfUserToHost.status
                END
       END AS youToThem
      FROM TifEventView
      LEFT JOIN userRelations UserRelationOfHostToUser
          ON TifEventView.hostId = UserRelationOfHostToUser.fromUserId
          AND UserRelationOfHostToUser.toUserId = :userId
      LEFT JOIN userRelations UserRelationOfUserToHost
          ON UserRelationOfUserToHost.fromUserId = :userId
          AND UserRelationOfUserToHost.toUserId = TifEventView.hostId
      WHERE TifEventView.id = :eventId;
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
            ).flatMapSuccess((dbUser) =>
              dbUser.themToYouStatus === "blocked" ||
              dbUser.youToThemStatus === "blocked"
                ? success(res
                  .status(403)
                  .json(getEventWhenBlockedResponse(dbUser, event.title, Number(event.id))))
                : setEventAttendeesFields(tx, [event], res.locals.selfId).flatMapSuccess((events) => refactorEventsToMatchTifEvent(events))// TODO: if no timezone, return error
                  .mapSuccess((event) => res.status(200).json(event[0]))
            )
          )
          .mapFailure((error) => res.status(404).json({ error }))
      )
  )
}
