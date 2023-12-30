import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import {
  EventAttendee,
  EventAttendeeCount,
  GetEventByRegionEvent
} from "../shared/SQL.js"
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
    title: event.title,
    description: event.description,
    color: event.color,
    // Add the event arrival status
    host: {
      id: event.hostId,
      name: event.hostName,
      handle: event.hostHandle,
      profileImageURL: event.hostProfileImageURL,
      haveRelations: {
        userToHost: event.relationHostToUser,
        hostToUser: event.relationHostToUser
      }
    },
    coordinates: {
      latitude: event.latitude,
      longitude: event.longitude
    },
    placemark: {
      name: event.name,
      country: event.country,
      street: event.street,
      streetNumber: event.street_num,
      city: event.city
    },
    duration: {
      startTimestamp: event.startTimestamp,
      endTimestamp: event.endTimestamp
    },
    settings: {
      shouldHideAfterStartDate: event.shouldHideAfterStartDate,
      isChatEnabled: event.isChatEnabled
    },
    attendees: {
      count: event.totalAttendees,
      preview: event.attendeesPreview
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
    U.name,
    U.handle,
    U.profileImageURL,
    UserRelationOfHostToUser.status AS relationHostToUser, 
    UserRelationOfUserToHost.status AS relationUserToHost
    FROM event E
    LEFT JOIN location L ON E.latitude = L.lat AND E.longitude = L.lon
    LEFT JOIN userRelations UserRelationOfHostToUser ON E.hostId = UserRelationOfHostToUser.fromUserId AND UserRelationOfHostToUser.toUserId = :userId
    LEFT JOIN userRelations UserRelationOfUserToHost ON UserRelationOfHostToUser.toUserId = UserRelationOfUserToHost.fromUserId AND UserRelationOfUserToHost.toUserId = UserRelationOfHostToUser.fromUserId
    LEFT JOIN user U ON E.hostId = U.id
    WHERE ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(E.longitude, E.latitude)) < :radius
      AND E.endTimestamp > NOW()
      AND (UserRelationOfHostToUser.status IS NULL OR UserRelationOfHostToUser.status <> 'blocked')
      AND (UserRelationOfUserToHost.status IS NULL OR UserRelationOfUserToHost.status <> 'blocked')
    GROUP BY E.id
  `,
    { ...eventsRequest }
  )

// export const getAttendees = (eventIds: string) => {
//   return conn.queryResults<EventAttendee>(
//     `
//     SELECT A.*
//     FROM event E
//     JOIN eventAttendance A ON E.id = A.eventId
//     WHERE E.id IN (:eventIds)
//     AND E.hostId <> A.userId
//     `,
//     { eventIds }
//   )
// }

export const getAttendees = (eventIds: string) => {
  return conn.queryResults<EventAttendee>(
    `
    SELECT 
    ea1.eventId,
    GROUP_CONCAT(DISTINCT ea1.userId ORDER BY ea1.joinTimestamp) AS userIds
FROM 
    eventAttendance ea1
WHERE 
    ea1.eventId IN (:eventIds)
GROUP BY 
    ea1.eventId
HAVING 
    COUNT(DISTINCT ea1.userId) <= 3
ORDER BY 
    ea1.eventId;
  `,
    { eventIds }
  )
}

const getAttendeeCount = (eventIds: string) => {
  return conn.queryResults<EventAttendeeCount>(
    ` SELECT
          E.eventId,
          COUNT(A.eventId) AS attendeeCount
      FROM
          eventAttendance A
      JOIN
          event E ON E.id = A.eventId
      WHERE
          E.id IN (:eventIds)
          AND E.hostId <> A.userId
      GROUP BY A.eventId `,
    { eventIds }
  )
}

// Modify this method so that it takes in the string array of event Attendees and
const setAttendeesPreviewForEvent = (
  events: GetEventByRegionEvent[],
  attendees: EventAttendee[],
  eventIdQueryString: string
) => {
  const eventAttendeesMap = new Map()
  const eventIdToCountArray = new Map()

  getAttendeeCount(eventIdQueryString).mapSuccess((attendees) => {
    attendees.forEach((attendee) => {
      if (eventIdToCountArray.has(attendee.eventId)) {
        eventIdToCountArray.get(attendee.eventId).push(attendee.attendeeCount)
      } else {
        // If the event is not in the map, add it with the attendee in a new array
        eventIdToCountArray.set(attendee.eventId, [attendee.attendeeCount])
      }
    })
  })

  attendees.forEach((attendee) => {
    const attendeeArray = attendee.userIds.split(",")
    if (eventAttendeesMap.has(attendee.eventId)) {
      eventAttendeesMap.get(attendee.eventId).push(attendeeArray)
    } else {
      // If the event is not in the map, add it with the attendee in a new array
      eventAttendeesMap.set(attendee.eventId, [attendeeArray])
    }
  })

  return events.map((event) => {
    event.attendeesPreview = eventAttendeesMap.get(event.id)
    event.totalAttendees = eventIdToCountArray.get(event.id)
    return event
  })
}

// Utilize the event to join with the attendees table to get the attendees
const getEventAttendeesPreview = (events: GetEventByRegionEvent[]) => {
  // Create a parameterized query string with placeholders for event IDs
  const eventIdQueryString = events.map((event) => event.id).join(",")
  const eventsByRegion = getAttendees(eventIdQueryString).mapSuccess(
    (attendees) =>
      setAttendeesPreviewForEvent(events, attendees, eventIdQueryString)
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
