import { SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { checkChatPermissionsTransaction } from "./getChatToken.js"
import { getEventById } from "./getEventById.js"
import { isUserNotBlocked } from "./sharedSQL.js"

const joinEventSchema = z.object({
  eventId: z.string()
})

const joinEvent = (conn: SQLExecutable, userId: string, eventId: number) => {
  return conn.transaction((tx) =>
    getEventById(conn, eventId)
      .flatMapSuccess((event) =>
        isUserNotBlocked(tx, event.hostId, userId).withSuccess(event)
      )
      .flatMapSuccess((event) =>
        new Date() < event.endTimestamp
          ? addUserToAttendeeList(tx, userId, eventId).flatMapSuccess(
            ({ rowsAffected }) =>
              rowsAffected > 0 ? success(201) : success(200)
          )
          : failure("event-has-ended")
      )
      .flatMapSuccess((status) => {
        return success({
          ...checkChatPermissionsTransaction(eventId, userId),
          status
        })
      })
  )
}

const addUserToAttendeeList = (
  conn: SQLExecutable,
  userId: string,
  eventId: number
) =>
  conn.queryResult(
    "INSERT IGNORE INTO eventAttendance (userId, eventId) VALUES (:userId, :eventId)",
    { userId, eventId }
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
        .mapSuccess((event) => res.status(event.status).json(event))
  )
}
