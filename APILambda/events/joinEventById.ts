import { SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { checkChatPermissionsTransaction } from "./getChatToken.js"
import { getEventById } from "./getEventById.js"
import { isUserNotBlocked } from "./sharedSQL.js"
import { ATTENDEE } from "../shared/Role.js";

const joinEventSchema = z.object({
  eventId: z.string()
})

const joinEvent = (conn: SQLExecutable, userId: string, eventId: number) => {
  return conn.transaction((tx) =>
    getEventById(conn, eventId, userId)
      .flatMapSuccess((event) =>
        isUserNotBlocked(tx, event.hostId, userId).withSuccess(event)
      )
      .flatMapSuccess((event) =>
        new Date() < event.endTimestamp // perform in sql?
          ? addUserToAttendeeList(tx, userId, eventId, ATTENDEE).flatMapSuccess(
            ({ rowsAffected }) =>
              rowsAffected > 0 ? success(201) : success(200)
          )
          : failure("event-has-ended" as const)
      )
      .flatMapSuccess((status) =>
        checkChatPermissionsTransaction(eventId, userId)
          .mapSuccess(chatPermissions => (
            { ...chatPermissions, status }
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
    { pathParamsSchema: joinEventSchema },
    (req, res) =>
      joinEvent(conn, res.locals.selfId, Number(req.params.eventId))
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
        .mapSuccess((event) => res.status(event.status).json({ id: event.id, token: event.tokenRequest }))
  )
}
