import { SQLExecutable, conn, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { EventAttendee, GetEventByRegionEvent } from "../shared/SQL.js"
import { ValidatedRouter } from "../validation.js"

const EventsRequestSchema = z.object({
  userLatitude: z.number(),
  userLongitude: z.number(),
  radius: z.number()
})

type EventsRequestByRegion = {
  userId: string
  userLatitude: number
  userLongitude: number
  radius: number
}

const getEventsByRegion = (
  conn: SQLExecutable,
  eventsRequest: EventsRequestByRegion
) =>
  conn.queryResults<GetEventByRegionEvent>(
    `
    SELECT E.*, L.*, 
    UserRelationOfHostToUser.status AS relationHostToUser, 
    UserRelationOfUserToHost.status AS relationUserToHost
    FROM event E
    LEFT JOIN location L ON E.latitude = L.lat AND E.longitude = L.lon
    LEFT JOIN userRelations UserRelationOfHostToUser ON E.hostId = UserRelationOfHostToUser.fromUserId AND UserRelationOfHostToUser.toUserId = :userId
    LEFT JOIN userRelations UserRelationOfUserToHost ON UserRelationOfHostToUser.toUserId = UserRelationOfUserToHost.fromUserId AND UserRelationOfUserToHost.toUserId = UserRelationOfHostToUser.fromUserId
    WHERE ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(E.longitude, E.latitude)) < :radius
      AND E.endTimestamp > NOW()
      AND (UserRelationOfHostToUser.status IS NULL OR UserRelationOfHostToUser.status <> 'blocked')
      AND (UserRelationOfUserToHost.status IS NULL OR UserRelationOfUserToHost.status <> 'blocked')
    GROUP BY E.id
  `,
    { ...eventsRequest }
  )

const getAttendees = (event: GetEventByRegionEvent) => {
  return conn.queryResults<EventAttendee>(
    `
  SELECT A.*
  FROM eventAttendance A
  WHERE A.eventId = :id
  `,
    { ...event }
  )
}

// Utilize the event to join with the attendees table to get the attendees
const getEventAttendeesPreview = (events: GetEventByRegionEvent[]) => {
  events.forEach((event) =>
    getAttendees(event).mapSuccess((eventAttendees) => {
      event.attendeesPreview = eventAttendees
    })
  )
  return success(events)
}

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const getEventsByRegionRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Get events by region
   */
  router.postWithValidation(
    "/region",
    { bodySchema: EventsRequestSchema },
    (req, res) =>
      getEventsByRegion(conn, {
        userId: res.locals.selfId,
        userLatitude: req.body.userLatitude,
        userLongitude: req.body.userLongitude,
        radius: req.body.radius
      })
        .flatMapSuccess((result) => getEventAttendeesPreview(result))
        .mapFailure((error) => res.status(401).json({ error }))
        .mapSuccess((result) => {
          return res.status(200).json(result)
        })
  )
}
