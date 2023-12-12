import { SQLExecutable, conn } from "TiFBackendUtils"
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

/**
 * Converts an AWS location search result into placemark format.
 *
 * @param {LatLng} location The latitude and longitude of the search result.
 * @param {Place | undefined} place The location search result from AWS.
 * @returns {Placemark} The location search result in placemark format.
 */
export const convertEventsByRegionResult = (event: GetEventByRegionEvent) => {
  return {
    id: event.id,
    hostId: event.hostId,
    title: event.title,
    description: event.description,
    color: event.color,
    eventRelations: {
      relationUserToHost: event.relationHostToUser,
      relationHostToUser: event.relationHostToUser
    },
    eventLocation: {
      city: event.city ?? "Unknown City",
      country: event.country ?? "Unknown Country",
      street: event.street ?? "Unknown Address",
      street_num: event.street_num ?? "",
      latitude: event.latitude,
      longitude: event.longitude
    },
    eventDuration: {
      startTimestamp: event.startTimestamp,
      endTimestamp: event.endTimestamp
    },
    eventPreferences: {
      shouldHideAfterStartDate: event.shouldHideAfterStartDate,
      isChatEnabled: event.isChatEnabled
    },
    eventAttendeeInformation: {
      totalAttendees: event.totalAttendees,
      attendeesPreview: event.attendeesPreview
    }
  }
}

export const getEventsByRegion = (
  conn: SQLExecutable,
  eventsRequest: EventsRequestByRegion
) =>
  conn.queryResults<GetEventByRegionEvent>(
    `
    SELECT E.*, 
    L.name,
    L.city, 
    L.country, 
    L.street, 
    L.street_num,
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

export const getAttendees = (eventIds: string) => {
  return conn.queryResults<EventAttendee>(
    `
  SELECT A.*
  FROM event E
  JOIN eventAttendance A ON E.id = A.eventId
  WHERE E.id IN (:eventIds)
  AND E.hostId <> A.userId
  `,
    { eventIds }
  )
}

const setTotalAttendeesForEvent = (
  events: GetEventByRegionEvent[],
  attendees: EventAttendee[]
) => {
  const eventAttendeesMap = new Map()

  attendees.forEach((attendee) => {
    if (eventAttendeesMap.has(attendee.eventId)) {
      eventAttendeesMap.get(attendee.eventId).push(attendee)
    } else {
      // If the event is not in the map, add it with the attendee in a new array
      eventAttendeesMap.set(attendee.eventId, [attendee])
    }
  })

  return events.map((event) => {
    event.totalAttendees = eventAttendeesMap.get(event.id).length
    event.attendeesPreview = eventAttendeesMap.get(event.id).slice(0, 3)
    return event
  })
}

// Utilize the event to join with the attendees table to get the attendees
const getEventAttendeesPreview = (events: GetEventByRegionEvent[]) => {
  // Create a parameterized query string with placeholders for event IDs
  const eventIds = events.map((event) => event.id)
  // Create a parameterized query string with placeholders for event IDs
  const eventIdQueryString = eventIds
    .map((_, index) => eventIds[index])
    .join(", ")
  const eventsByRegion = getAttendees(eventIdQueryString).mapSuccess(
    (attendees) => setTotalAttendeesForEvent(events, attendees)
  )
  const refactoredEventsByRegion = eventsByRegion.mapSuccess((events) =>
    events.map((event) => convertEventsByRegionResult(event))
  )
  return refactoredEventsByRegion
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
