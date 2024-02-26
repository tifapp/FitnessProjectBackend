// eslint-disable-next-line import/extensions
import dayjs from "dayjs"
import { SQLExecutable } from "./SQLExecutable"
// eslint-disable-next-line import/extensions
import { find } from "geo-tz"
import { success } from "./result"

type UserHostRelations = "not friends" | "friend-request-pending" | "friends" | "blocked"
type TodayOrTomorrow = "Today" | "Tomorrow" | ""
type Role = "host" | "attendee" | "not-participating"

export type EventWithAttendeeCount = {
  eventId: number
  attendeeCount: number
}

export type EventAttendee = {
    userIds: string
    eventId: number
  }

export type TiFFlatEvent = {
    id: string
    title: string
    description: string
    themToYou: UserHostRelations
    youToThem: UserHostRelations
    attendeeCount: number
    secondsToStart?: number // Need to calculate
    timeZoneIdentifier?: string // Use the find function to determine
    startDateTime: Date
    endDateTime: Date
    todayOrTomorrow: TodayOrTomorrow // Need to calculate
    previewAttendees: EventAttendee[]
    latitude: number
    longitude: number
    placemarkName?: string
    country?: string
    postalCode?: string // Need to determine
    street?: string
    streetNumber?: string
    region?: string // Need to determine
    isoCountryCode?: string // Need to determine
    city?: string
    arrivalRadiusMeters: number // Set default to '0'
    isInArrivalTrackingPeriod: boolean // Need to calculate
    hostId: string
    hostUsername?: string
    hostHandle?: string
    profileImageURL?: string // Can't find in any table? Return "" by default
    shouldHideAfterStartDate: boolean
    isChatEnabled: boolean
    userAttendeeStatus: Role // Get from Henry's PR
    joinDate?: Date
    isChatExpired: boolean
    chatExpirationTimeInHours?: number // Ask the others where this data will be stored, give a default value of 24 hours for now
    hasArrived: boolean // check userArrivals table
    updatedAt: Date
    createdAt: Date // Can't find this field in the events table
    endedAt: Date // Null until the event has ended
  }

export type TiFEvent = {
    id: string
    title: string
    description: string
    relations: {
      themToYou: UserHostRelations
      youToThem: UserHostRelations
    }
    attendeeCount: number
    time: {
      secondsToStart?: number // Need to calculate
      timeZoneIdentifier?: string // Use the find function to determine
      dateRange: {
        startDateTime: Date
        endDateTime: Date
      }
       todayOrTomorrow: TodayOrTomorrow // Need to calculate
    }
    previewAttendees: EventAttendee[]
    location: {
      coordinate: {
        latitude: number
        longitude: number
      }
      placemark?: {
        name?: string
        country?: string
        postalCode?: string // Need to determine
        street?: string
        streetNumber?: string
        region?: string // Need to determine
        isoCountryCode?: string // Need to determine
        city?: string
      }
      arrivalRadiusMeters: number // Set default to '0'
      isInArrivalTrackingPeriod: boolean // Need to calculate
    }
    host: {
      id: string
      username?: string // Use a default?
      handle?: string // Use a default?
      profileImageURL?: string // Can't find in any table?
    }
    settings: {
      shouldHideAfterStartDate: boolean
      isChatEnabled: boolean
      isChatExpired: boolean // How do we determine this?
    }
    userAttendeeStatus: Role // Get from Henry's PR
    joinDate?: Date
    hasArrived: boolean // check userArrivals table
    updatedAt: Date
    createdAt: Date // Can't find this field in the events table
    endedAt: Date
  }

const calcSecondsToStart = (event: TiFFlatEvent) => {
  const millisecondsToStart = event.startDateTime.getUTCMilliseconds() - new Date().getUTCMilliseconds()
  return millisecondsToStart / 1000
}

export const calcTodayOrTomorrow = (event: TiFFlatEvent) => {
  const currentDate = dayjs()
  const eventDate = dayjs(event.createdAt)
  if (currentDate.isSame(eventDate)) {
    return "Today"
  } else if (eventDate.isSame(currentDate.add(1, "day"), "day")) {
    return "Tomorrow"
  } else {
    return ""
  }
}

export const getTimeZone = (latitude: number, longitude: number) => {
  return find(latitude, longitude)
}

export const addMissingTifEventFields = (event: TiFFlatEvent) => {
  event.timeZoneIdentifier = getTimeZone(event.latitude, event.longitude)[0]
  event.arrivalRadiusMeters = 0
  event.secondsToStart = calcSecondsToStart(event)
  event.todayOrTomorrow = calcTodayOrTomorrow(event)
  // event is in tracking period if the event starts within 24 hours
  // 3600 seconds in an hour
  event.isInArrivalTrackingPeriod = calcSecondsToStart(event) < 86400000
  event.profileImageURL = ""
  event.chatExpirationTimeInHours = 24
  // Chat expires 24 hours after the event has ended
  // 86400000 milliseconds in a day
  const chatExpirationDate = event.endedAt.getUTCMilliseconds() + 86400000
  event.isChatExpired = new Date().getUTCMilliseconds() > chatExpirationDate
  return event
}

export const addFieldsToTifEvent = (event: TiFFlatEvent) => {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    relations: {
      themToYou: event.themToYou,
      youToThem: event.youToThem
    },
    attendeeCount: event.attendeeCount,
    time: {
      secondsToStart: event.secondsToStart,
      timeZoneIdentifier: event.timeZoneIdentifier,
      dateRange: {
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime
      },
      todayOrTomorrow: event.todayOrTomorrow
    },
    previewAttendees: event.previewAttendees,
    location: {
      coordinate: {
        latitude: event.latitude,
        longitude: event.longitude
      },
      placemark: {
        name: event.placemarkName,
        country: event.country,
        postalCode: event.postalCode,
        street: event.street,
        streetNumber: event.streetNumber,
        region: event.region,
        isoCountryCode: event.isoCountryCode,
        city: event.city
      },
      arrivalRadiusMeters: event.arrivalRadiusMeters,
      isInArrivalTrackingPeriod: event.isInArrivalTrackingPeriod
    },
    host: {
      id: event.hostId,
      username: event.hostUsername,
      handle: event.hostHandle,
      profileImageURL: ""
    },
    settings: {
      shouldHideAfterStartDate: event.shouldHideAfterStartDate,
      isChatEnabled: event.isChatEnabled
    },
    userAttendeeStatus: event.userAttendeeStatus,
    joinDate: event.joinDate,
    isChatExpired: event.isChatExpired,
    hasArrived: event.hasArrived,
    updatedAt: event.updatedAt,
    createdAt: event.createdAt
  }
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
  events: TiFFlatEvent[],
  attendeesPreviews: EventAttendee[],
  eventsWithAttendeeCount: EventWithAttendeeCount[]
) => {
  for (let i = 0; i < events.length; i++) {
    events[i].previewAttendees = attendeesPreviews ?? []
    events[i].attendeeCount = eventsWithAttendeeCount[i]
      ? eventsWithAttendeeCount[i].attendeeCount
      : 0
  }
  return events
}

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

// Utilize the event to join with the attendees table to get the attendees
export const getEventAttendeesPreview = (
  conn: SQLExecutable,
  events: TiFFlatEvent[]
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

  const refactoredEvents = eventsByRegion.mapSuccess((events) =>
    events.map((event) => {
      const tifFlatEvent = addMissingTifEventFields(event)
      return addFieldsToTifEvent(tifFlatEvent)
    })
  )

  return refactoredEvents
}
