import { conn, success } from "TiFBackendUtils"
import { z } from "zod"
import {
  ChatPermissions,
  createTokenRequest
} from "../ably.js"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { getEventById } from "./getEventById.js"
import { isUserInEvent, isUserNotBlocked } from "./sharedSQL.js"

type Role = "admin" | "attendee" | "viewer"

const rolesMap: Record<Role, ChatPermissions> = {
  admin: {
    event: ["history", "subscribe", "publish"],
    eventPinned: ["history", "subscribe", "publish"]
  },
  attendee: {
    event: ["history", "subscribe", "publish"],
    eventPinned: ["history", "subscribe"]
  },
  viewer: {
    event: ["history", "subscribe"],
    eventPinned: ["history", "subscribe"]
  }
}

// Create a method get the user's role
const determineRole = (
  hostId: string,
  endDateTime: Date,
  userId: string
): Role => {
  if (hostId === userId) {
    return "admin"
  } else if (new Date() <= new Date(endDateTime)) {
    return "attendee"
  } else {
    return "viewer"
  }
}

export const determineChatPermissions = (
  hostId: string,
  endDateTime: Date,
  userId: string,
  eventId: number
): ChatPermissions => {
  const role = determineRole(hostId, endDateTime, userId)

  const permissions = rolesMap[role]

  return {
    [`${eventId}`]: permissions.event,
    [`${eventId}-pinned`]: permissions.eventPinned
  }
}

export const checkChatPermissionsTransaction = (
  eventId: number,
  userId: string
) =>
  conn.transaction((tx) =>
    getEventById(tx, eventId, userId)
      .flatMapSuccess(event => isUserInEvent(tx, userId, eventId).mapSuccess(() => event))
      .flatMapSuccess(event => isUserNotBlocked(tx, event.hostId, userId).mapSuccess(() => event))
  )
    .flatMapSuccess(async (event) => {
      const permissions = determineChatPermissions(
        event.hostId,
        event.endDateTime,
        userId,
        eventId
      )

      const tokenRequest = await createTokenRequest(permissions, userId)

      return success({ id: eventId, tokenRequest })
    })

const eventRequestSchema = z.object({
  eventId: z.string()
})

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getChatTokenRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Get token for event's chat room
   */
  router.getWithValidation(
    "/chat/:eventId",
    { pathParamsSchema: eventRequestSchema },
    (req, res) =>
      checkChatPermissionsTransaction(Number(req.params.eventId), res.locals.selfId)
        .mapFailure(error => res.status(error === "event-not-found" ? 404 : error === "user-not-attendee" || error === "user-is-blocked" ? 403 : 500).json({ error }))
        .mapSuccess(event => res.status(200).json(event))
  )
}
