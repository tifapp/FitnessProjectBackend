import { Connection } from "@planetscale/database"
import { z } from "zod"
import {
  AblyTokenRequest,
  ChatPermissions,
  createTokenRequest
} from "../ably.js"
import {
  // selectLastInsertionNumericId,
  hasResults
} from "../dbconnection.js"
import { ServerEnvironment } from "../env.js"
import { DatabaseEvent, getEventWithId } from "../shared/SQL.js"
import { Result } from "../utils.js"
import { ValidatedRouter } from "../validation.js"

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

type EventUserAccessError =
  | "event does not exist"
  | "user is not apart of event"
  | "user is blocked by event host"
  | "user does not exist"

type ChatResult = Result<
  { id: string; tokenRequest: AblyTokenRequest },
  EventUserAccessError | "cannot generate token"
>

type EventResult = Result<DatabaseEvent, EventUserAccessError>

// Create a method get the user's role
const determineRole = (
  hostId: string,
  endTimestamp: Date,
  userId: string
): Role => {
  if (hostId === userId) {
    return "admin"
  } else if (new Date() <= new Date(endTimestamp)) {
    return "attendee"
  } else {
    return "viewer"
  }
}

export const determineChatPermissions = (
  hostId: string,
  endTimestamp: Date,
  userId: string,
  eventId: number
): ChatPermissions => {
  const role = determineRole(hostId, endTimestamp, userId)

  const permissions = rolesMap[role]

  return {
    [`${eventId}`]: permissions.event,
    [`${eventId}-pinned`]: permissions.eventPinned
  }
}

export const createTokenRequestWithPermissionsTransaction = async (
  conn: Connection,
  eventId: number,
  userId: string
): Promise<ChatResult> => {
  const result: EventResult = await conn.transaction(async (tx) => {
    const event = await getEventWithId(tx, eventId)

    if (event == null) {
      return { status: "error", value: "event does not exist" }
    }

    const userInEvent = await hasResults(
      conn,
      "SELECT TRUE FROM eventAttendance WHERE userId = :userId AND eventId = :eventId;",
      { userId, eventId }
    )

    if (!userInEvent) {
      return { status: "error", value: "user is not apart of event" }
    }

    const userBlocked = await hasResults(
      conn,
      "SELECT TRUE FROM userRelations WHERE fromUserId = :hostId AND toUserId = :userId AND status = 'blocked';",
      { userId, hostId: event.hostId }
    )

    if (userBlocked) {
      return { status: "error", value: "user is blocked by event host" }
    }

    return { status: "success", value: event }
  })

  if (result.status === "error") {
    return result
  }

  const permissions = determineChatPermissions(
    result.value.hostId,
    result.value.endTimestamp,
    userId,
    eventId
  )

  try {
    const tokenRequest = await createTokenRequest(permissions, userId)
    return { status: "success", value: { id: userId, tokenRequest } }
  } catch {
    return { status: "error", value: "cannot generate token" }
  }
}

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
    async (req, res) => {
      const result = await createTokenRequestWithPermissionsTransaction(
        environment.conn,
        Number(req.params.eventId),
        res.locals.selfId
      )

      // TODO: should use a map of result.values to error codes to avoid this conditional
      if (result.status === "error") {
        if (result.value === "user is blocked by event host") {
          return res.status(403).json({ body: result.value })
        }
        return res.status(404).json({ body: result.value })
      } else {
        return res.status(200).json({ body: result.value })
      }
    }
  )
}
