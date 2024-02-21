import { SQLExecutable, conn, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import {
  EventAttendee,
  EventWithAttendeeCount,
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
        userToHost: event.relationUserToHost,
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
    SELECT * 
    FROM ViewEvents
    WHERE ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(longitude, latitude)) < :radius
      AND endTimestamp > NOW()
      AND (relationHostToUser IS NULL OR relationHostToUser <> 'blocked')
      AND (relationUserToHost IS NULL OR relationUserToHost <> 'blocked')
  `,
    { ...eventsRequest }
  )

export const getAttendees = (conn: SQLExecutable, eventIds: string[]) => {
  return conn.queryResults<EventAttendee>(
    `
    SELECT 
    eventId,
    userIds
FROM 
    ViewEventAttendees
WHERE 
    eventId IN (:eventIds)
GROUP BY 
    eventId
HAVING 
    COUNT(DISTINCT userIds) <= 3
  `,
    { eventIds }
  )
}

export const getAttendeeCount = (conn: SQLExecutable, eventIds: string[]) => {
  return conn.queryResults<EventWithAttendeeCount>(
    ` SELECT
          id,
          attendeeCount
      FROM
          ViewEventAttendeeCount
      WHERE
        id IN (:eventIds)
      GROUP BY id`,
    { eventIds }
  )
}

const setAttendeesPreviewForEvent = (
  events: GetEventByRegionEvent[],
  attendeesPreviews: EventAttendee[],
  eventsWithAttendeeCount: EventWithAttendeeCount[]
) => {
  for (let i = 0; i < events.length; i++) {
    events[i].attendeesPreview = attendeesPreviews ?? []
    events[i].totalAttendees = eventsWithAttendeeCount[i]
      ? eventsWithAttendeeCount[i].attendeeCount
      : 0
  }
  return events
}

// Utilize the event to join with the attendees table to get the attendees
const getEventAttendeesPreview = (
  conn: SQLExecutable,
  events: GetEventByRegionEvent[]
) => {
  const eventIds = events.map((event) => event.id.toString())

  if (!eventIds.length) {
    return success([])
  }

  const eventsByRegion = getAttendees(conn, eventIds).flatMapSuccess(
    (attendeesPreviews) =>
      getAttendeeCount(conn, eventIds).mapSuccess((eventsWithAttendeeCount) => {
        return setAttendeesPreviewForEvent(
          events,
          attendeesPreviews,
          eventsWithAttendeeCount
        )
      })
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
      conn
        .transaction((tx) =>
          getEventsByRegion(tx, {
            userId: res.locals.selfId,
            userLatitude: req.body.userLatitude,
            userLongitude: req.body.userLongitude,
            radius: req.body.radius
          }).flatMapSuccess((result) => getEventAttendeesPreview(tx, result))
        )
        .mapSuccess((result) => {
          return res.status(200).json(result)
        })
  )
}
