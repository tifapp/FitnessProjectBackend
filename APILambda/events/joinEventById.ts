import { SQLExecutable, conn, failure } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { checkChatPermissionsTransaction } from "./getChatToken.js"
import { getEventById } from "./getEventById.js"
import { isUserNotBlocked } from "./sharedSQL.js"

const joinEventSchema = z
  .object({
    eventId: z.string()
  })

const joinEvent = (
  conn: SQLExecutable,
  userId: string,
  eventId: number) => {
  return conn.transaction((tx) =>
    getEventById(conn, eventId)
      .flatMapSuccess(
        (event) => isUserNotBlocked(tx, event.hostId, userId).withSuccess(event)
      ).flatMapSuccess(
        (event) => new Date() < event.endTimestamp
          ? addUserToAttendeeList(conn, userId, eventId)
          : failure("event-has-ended")
      ).flatMapSuccess(
        () => checkChatPermissionsTransaction(eventId, userId)
      )
  )
}

const addUserToAttendeeList = (conn: SQLExecutable, userId: string, eventId: number) => conn.queryResults(
  `INSERT INTO eventAttendance (userId, eventId, joinDate)
    VALUES (:userId, :eventId, CURRENT_TIMESTAMP())`,
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
  router.postWithValidation("/join/:eventId", { pathParamsSchema: joinEventSchema }, (req, res) =>
    joinEvent(conn, res.locals.selfId, Number(req.params.eventId))
      .mapFailure((error) => res.status(error === "event-not-found" ? 404 : error === "user-is-blocked" || error === "event-has-ended" ? 403 : 500).json({ error }))
      .mapSuccess((event) => res.status(200).json(event)))
}
