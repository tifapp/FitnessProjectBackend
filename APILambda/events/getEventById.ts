import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { TiFFlatEvent, getEventAttendeesPreview } from "../../TiFBackendUtils/TifEventUtils.js"
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
    .queryFirstResult<TiFFlatEvent>(
      `
    SELECT 
      e.id,
      e.description,
      e.title,
      e.hostId,
      e.shouldHideAfterStartDate AS shouldHideAfterStartDate,
      e.isChatEnabled AS isChatEnabled,
      e.createdAt,
      e.updatedAt,
      host.name AS hostUsername,
      host.handle AS hostHandle,
      UserRelationOfHostToUser.status AS themToYou,
      UserRelationOfUserToHost.status AS youToThem,
      userEventAttendance.role AS userAttendeeStatus,
      ea.joinTimestamp AS joinDate,
      e.startTimestamp AS startDateTime,
      e.endTimestamp AS endDateTime,
      L.name AS placemarkName,
      L.city, 
      L.country, 
      L.street, 
      L.street_num AS streetNumber, 
      L.timeZone,
      L.lat AS latitude,
      L.lon AS longitude,
      L.postalCode,
      L.region,
      L.isoCountryCode,
      UserRelationOfUserToHost.updatedAt AS updatedAt,
      CASE 
        WHEN ua.userId IS NOT NULL THEN 1
        ELSE 0
      END AS hasArrived
      CASE
        WHEN e.endedAt IS NULL THEN current_timestamp()
        ELSE e.endedAt
      END AS endedAt
    FROM 
        event e
    LEFT JOIN 
        userArrivals ua ON e.latitude = ua.latitude
                        AND e.longitude = ua.longitude
                        AND ua.userId = :userId
    LEFT JOIN userRelations AS relationHostToUser ON e.hostId = relationHostToUser.fromUserId
    LEFT JOIN userRelations AS relationUserToHost ON relationUserToHost.toUserId = e.hostId
    LEFT JOIN 
        location L ON e.latitude = L.lat 
                  AND e.longitude = L.lon
    LEFT JOIN eventAttendance ea ON ea.eventId = e.id
    LEFT JOIN eventAttendance userEventAttendance ON userEventAttendance.userId = :userId
    LEFT JOIN user host ON host.id = e.hostId
    WHERE 
        e.id = :eventId
        AND e.endTimestamp > NOW()
        AND (relationHostToUser IS NULL OR relationHostToUser <> 'blocked')
        AND (relationUserToHost IS NULL OR relationUserToHost <> 'blocked')
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
          .flatMapSuccess((event) => {
            return getEventAttendeesPreview(conn, [event])
            // const tifFlatEvent = addMissingTifEventFields(event)
            // return success(addFieldsToTifEvent(tifFlatEvent))
          }
          )
          .flatMapSuccess((event) =>
            userAndRelationsWithId(
              tx,
              event[0].host.id,
              res.locals.selfId
            ).mapSuccess((dbUser) =>
              dbUser.themToYouStatus === "blocked" ||
              dbUser.youToThemStatus === "blocked"
                ? res
                  .status(403)
                  .json(getEventWhenBlockedResponse(dbUser, event[0].title))
                : res.status(200).json(event)
            )
          )
          .mapFailure((error) => res.status(404).json({ error }))
      )
  )
}
