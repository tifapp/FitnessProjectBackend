import { LocationCoordinate2D, LocationCoordinates2DSchema, SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { getUpcomingEventsByRegion } from "./arrivals/getUpcomingEvents.js"
import { insertArrival } from "./arrivals/setArrivalStatus.js"
import { checkChatPermissionsTransaction } from "./getChatToken.js"
import { getEventById } from "./getEventById.js"
import { isUserNotBlocked } from "./sharedSQL.js"

const joinEventParamsSchema = z.object({
  eventId: z.string()
})

const joinEventBodySchema = z
  .object({
    region: z.object({
      coordinate: LocationCoordinates2DSchema,
      arrivalRadiusMeters: z.number()
    })
  }).optional()

export type JoinEventInput = z.infer<typeof joinEventBodySchema>

const joinEvent = (conn: SQLExecutable, userId: string, eventId: number, coordinate?: LocationCoordinate2D) => {
  return conn.transaction((tx) =>
    getEventById(tx, eventId, userId)
      .flatMapSuccess((event) =>
        (new Date() < event.endTimestamp && !event.endedAt // perform in sql?
          ? isUserNotBlocked(tx, event.hostId, userId)
          : failure("event-has-ended" as const))
          .flatMapSuccess(() =>
            (coordinate && event.longitude === coordinate.longitude && event.latitude === coordinate.latitude
              ? insertArrival(
                tx,
                userId,
                coordinate
              ).mapSuccess(() => ({ isArrived: true }))
              : success(({ isArrived: false })))
              .flatMapSuccess(({ isArrived }) =>
                addUserToAttendeeList(tx, userId, eventId, "attending")
                  .flatMapSuccess(
                    ({ rowsAffected }) =>
                      rowsAffected > 0 ? success({ status: 201 }) : success({ status: 200 })
                  )
                  .flatMapSuccess(({ status }) =>
                    checkChatPermissionsTransaction(eventId, userId)
                      .flatMapSuccess((chatPermissions) => getUpcomingEventsByRegion(tx, userId)
                        .mapSuccess(upcomingRegions => (
                          { ...chatPermissions, status, isArrived, upcomingRegions }
                        ))
                      )
                  )
              )
          )

      )
  )
}

// ADD CHECK IF HOST TRIES JOINING THEIR OWN EVENT
// AUTO MAKE HOST AN ATTENDEE
export const addUserToAttendeeList = (
  conn: SQLExecutable,
  userId: string,
  eventId: number,
  role: string
) =>
  conn.queryResult(
    "INSERT IGNORE INTO eventAttendance (userId, eventId, role) VALUES (:userId, :eventId, :role)",
    { userId, eventId, role }
  )

/**
 * Join an event given an event id.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const joinEventRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Join an event
   */
  router.postWithValidation(
    "/join/:eventId",
    { pathParamsSchema: joinEventParamsSchema, bodySchema: joinEventBodySchema },
    (req, res) =>
      joinEvent(conn, res.locals.selfId, Number(req.params.eventId), req.body?.region?.coordinate)
        .mapFailure((error) =>
          res
            .status(
              error === "event-not-found"
                ? 404
                : error === "user-is-blocked" || error === "event-has-ended"
                  ? 403
                  : 500
            )
            .json({ error })
        )
        .mapSuccess(({ status, id, tokenRequest, isArrived, upcomingRegions }) => res.status(status).json({ id, token: tokenRequest, isArrived, upcomingRegions }))
  )
}
