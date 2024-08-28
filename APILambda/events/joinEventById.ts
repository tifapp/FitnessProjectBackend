import { MySQLExecutableDriver, conn } from "TiFBackendUtils"
import { LocationCoordinate2D, LocationCoordinate2DSchema } from "TiFShared/domain-models/LocationCoordinate2D"
import { failure, success } from "TiFShared/lib/Result"
import { z } from "zod"
import { ServerEnvironment } from "../env"
import { ValidatedRouter } from "../validation"
import { getUpcomingEventsByRegion } from "./arrivals/getUpcomingEvents"
import { insertArrival } from "./arrivals/setArrivalStatus"
import { checkChatPermissionsTransaction } from "./getChatToken"
import { getEventById } from "./getEventById"
import { isUserNotBlocked } from "./sharedSQL"

const joinEventParamsSchema = z.object({
  eventId: z.string()
})

const joinEventBodySchema = z
  .object({
    region: z.object({
      coordinate: LocationCoordinate2DSchema,
      arrivalRadiusMeters: z.number()
    })
  }).optional()

export type JoinEventInput = z.infer<typeof joinEventBodySchema>

const joinEvent = (conn: MySQLExecutableDriver, userId: string, eventId: number, coordinate?: LocationCoordinate2D) => {
  return conn.transaction((tx) =>
    getEventById(tx, eventId, userId)
      .flatMapSuccess((event) =>
        (new Date() < event.endDateTime && !event.endedDateTime // perform in sql?
          ? isUserNotBlocked(tx, event.hostId, userId)
          : failure("event-has-ended" as const))
          .flatMapSuccess(() =>
            (coordinate && event.longitude === coordinate.longitude && event.latitude === coordinate.latitude
              ? insertArrival(
                tx,
                userId,
                coordinate
              ).mapSuccess(() => ({ hasArrived: true }))
              : success(({ hasArrived: false })))
              .flatMapSuccess(({ hasArrived }) =>
                addUserToAttendeeList(tx, userId, eventId, "attending")
                  .flatMapSuccess(
                    ({ rowsAffected }) =>
                      rowsAffected > 0 ? success({ status: 201 }) : success({ status: 200 })
                  )
                  .flatMapSuccess(({ status }) =>
                    checkChatPermissionsTransaction(eventId, userId)
                      .flatMapSuccess((chatPermissions) => getUpcomingEventsByRegion(tx, userId)
                        .mapSuccess(upcomingRegions => (
                          { ...chatPermissions, status, hasArrived, upcomingRegions }
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
  conn: MySQLExecutableDriver,
  userId: string,
  eventId: number,
  role: string
) =>
  conn.executeResult(
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
        .mapSuccess(({ status, id, tokenRequest, hasArrived, upcomingRegions }) => res.status(status).json({ id, token: tokenRequest, hasArrived, upcomingRegions }))
  )
}
