import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { TiFEvent } from "../shared/SQL.js"
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
    .queryFirstResult<TiFEvent>(
      `
    SELECT 
      e.id,
      e.description,
      e.title,
      e.hostId,
      e.shouldHideAfterStartDate AS shouldHideAfterStartDate,
      e.isChatEnabled AS isChatEnabled,
      UserRelationOfHostToUser.status AS themToYou,
      UserRelationOfUserToHost.status AS youToThem,
      COUNT(A.eventId) AS attendeeCount,
      userEventAttendance.role AS userAttendeeStatus,
      A.joinTimestamp AS joinDate,
      e.startTimestamp AS startDateTime,
      e.endTimestamp AS endDateTime,
      GROUP_CONCAT(A.userId ORDER BY A.joinTimestamp ASC SEPARATOR ',') AS previewAttendees,
      L.name,
      L.city, 
      L.country, 
      L.street, 
      L.street_num AS streetNumber, 
      L.timeZone,
      L.lat AS latitude,
      L.lon AS longitude,
      UserRelationOfUserToHost.updatedAt AS updatedAt,
      CASE 
        WHEN ua.userId IS NOT NULL THEN 1
        ELSE 0
      END AS hasArrived
    FROM 
        event e
    LEFT JOIN 
        userArrivals ua ON e.latitude = ua.latitude 
                        AND e.longitude = ua.longitude 
                        AND ua.userId = :userId
    LEFT JOIN userRelations AS UserRelationOfHostToUser ON e.hostId = UserRelationOfHostToUser.fromUserId
    LEFT JOIN userRelations AS UserRelationOfUserToHost ON UserRelationOfUserToHost.toUserId = e.hostId
    LEFT JOIN 
        location L ON e.latitude = L.lat 
                  AND e.longitude = L.lon
    LEFT JOIN eventAttendance A on A.eventId = e.id
    LEFT JOIN eventAttendance userEventAttendance on userEventAttendance.userId = :userId
    WHERE 
        e.id = :eventId;
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
