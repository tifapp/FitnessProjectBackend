import { DBTifEvent, MySQLExecutableDriver, TiFEvent, conn, setEventAttendeesFields, tifEventResponseFromDatabaseEvent } from "TiFBackendUtils"
import { success } from "TiFShared/lib/Result.js"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const eventRequestSchema = z.object({
  eventId: z.string()
})

export type BlockedTiFEventResponse = Pick<TiFEvent, "title" | "id" | "host" | "createdDateTime" | "updatedDateTime">

const getEventWhenBlockedResponse = (
  event: DBTifEvent
): BlockedTiFEventResponse => ({
  title: event.title,
  id: event.id,
  host: {
    username: event.hostUsername,
    id: event.hostId,
    handle: event.hostHandle,
    profileImageURL: null,
    relations: {
      fromThemToYou: event.fromThemToYou,
      fromYouToThem: event.fromYouToThem
    }
  },
  createdDateTime: event.createdDateTime,
  updatedDateTime: event.updatedDateTime
})

export const getEventById = (
  conn: MySQLExecutableDriver,
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
       END AS fromThemToYou,
       CASE
           WHEN TifEventView.hostId = :userId THEN 'current-user'
           ELSE CASE
                    WHEN UserRelationOfUserToHost.status IS NULL THEN 'not-friends'
                    ELSE UserRelationOfUserToHost.status
                END
       END AS fromYouToThem
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
            event.fromThemToYou === "blocked" ||
            event.fromYouToThem === "blocked"
              ? success(res
                .status(403)
                .json(getEventWhenBlockedResponse(event)))
              : setEventAttendeesFields(tx, [event], res.locals.selfId).mapSuccess(([event]) => tifEventResponseFromDatabaseEvent(event)) // TODO: if no timezone, return error
                .mapSuccess((event) => res.status(200).json(event))
          )
          .mapFailure((error) => res.status(404).json({ error }))
      )
  )
}
