import dayjs from "dayjs"
import duration from "dayjs/plugin/duration.js"
import { DBTifEventView, DBViewEventAttendees, DBuserRelations } from "./Planetscale/entities.js"
import { SQLExecutable } from "./SQLExecutable/utils.js"
import { Placemark } from "./location.js"
import { success } from "./result.js"
dayjs.extend(duration)

// Get the total seconds in the duration
export const SECONDS_IN_DAY = dayjs.duration(1, "day").asSeconds()
export const ARRIVAL_RADIUS_IN_METERS = 120

export type UserHostRelations = "not-friends" | "friend-request-pending" | "friends" | "blocked" | "current-user"
export type TodayOrTomorrow = "today" | "tomorrow"
export type Role = "hosting" | "attending" | "not-participating"
export type Attendee = { id: string, profileImageURL: string | null}
export type DBTifEvent = DBTifEventView & Omit<DBuserRelations, "status" | "updatedAt"> &
{ attendeeCount: number, previewAttendees: Attendee[], userAttendeeStatus: Role, joinDate: Date, themToYou: UserHostRelations, youToThem: UserHostRelations }

export type EventWithAttendeeCount = {
  eventId: number
  attendeeCount: number
}

export type EventAttendee = {
    userId: string
    eventId: number
  }

export type EventAttendanceFields = {
  joinDate: Date
  userAttendeeStatus: Role
}

export type TiFEvent = {
    id: string
    title: string
    description: string
    attendeeCount: number
    color: string
    time: {
      secondsToStart: number
      dateRange: {
        startDateTime: Date
        endDateTime: Date
      }
      todayOrTomorrow: TodayOrTomorrow | null
    }
    previewAttendees: Attendee[]
    location: {
      coordinate: {
        latitude: number,
        longitude: number
      },
      timezoneIdentifier: string | null,
      placemark: Omit<Placemark, "lat" | "lon"> | null,
      arrivalRadiusMeters: number
      isInArrivalTrackingPeriod: boolean
    }
    host: {
      relations: {
        themToYou: UserHostRelations
        youToThem: UserHostRelations
      }
      id: string
      username: string | null
      handle: string | null
      profileImageURL: string | null
    }
    settings: {
      shouldHideAfterStartDate: boolean
      isChatEnabled: boolean
    }
    isChatExpired: boolean
    userAttendeeStatus: Role
    joinDate: Date | null
    hasArrived: boolean
    updatedAt: Date
    createdAt: Date
    endedAt: Date | null
  }

export const calcSecondsToStart = (startDateTime: Date) => {
  const millisecondsToStart = startDateTime.valueOf() - new Date().valueOf()
  return millisecondsToStart / 1000
}

const isChatExpired = (endedAt: Date | null) => {
  if (endedAt === null) {
    return false
  }

  const chatEndedAt = dayjs(endedAt)
  const nextDay = chatEndedAt.add(1, "day")

  const diffInHours = nextDay.diff(endedAt, "hour")

  return diffInHours >= 24
}

export const calcTodayOrTomorrow = (startDateTime: Date) => {
  const currentDate = dayjs()
  const eventDate = dayjs(startDateTime)

  if (currentDate.isSame(eventDate, "day")) {
    return "today"
  } else if (eventDate.isSame(currentDate.add(1, "day"), "day")) {
    return "tomorrow"
  } else {
    return null
  }
}

export const tifEventResponseFromDatabaseEvent = (event: DBTifEvent) : TiFEvent => {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    attendeeCount: event.attendeeCount,
    color: event.color,
    time: {
      secondsToStart: calcSecondsToStart(event.startDateTime),
      dateRange: {
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime
      },
      todayOrTomorrow: calcTodayOrTomorrow(event.startDateTime)
    },
    previewAttendees: event.previewAttendees,
    location: {
      coordinate: {
        latitude: event.latitude,
        longitude: event.longitude
      },
      placemark: {
        name: event.placemarkName ?? undefined,
        country: event.country ?? undefined,
        postalCode: event.postalCode ?? undefined,
        street: event.street ?? undefined,
        streetNumber: event.streetNumber ?? undefined,
        region: event.region ?? undefined,
        isoCountryCode: event.isoCountryCode ?? undefined,
        city: event.city ?? undefined
      },
      timezoneIdentifier: event.timezoneIdentifier,
      arrivalRadiusMeters: ARRIVAL_RADIUS_IN_METERS,
      isInArrivalTrackingPeriod: calcSecondsToStart(event.startDateTime) < SECONDS_IN_DAY
    },
    host: {
      relations: {
        themToYou: event.themToYou,
        youToThem: event.youToThem
      },
      id: event.hostId,
      username: event.hostUsername,
      handle: event.hostHandle,
      profileImageURL: null
    },
    settings: {
      shouldHideAfterStartDate: event.shouldHideAfterStartDate,
      isChatEnabled: event.isChatEnabled
    },
    userAttendeeStatus: event.userAttendeeStatus,
    joinDate: event.joinDate,
    isChatExpired: isChatExpired(event.endedAt),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    hasArrived: event.hasArrived === 1,
    updatedAt: new Date(event.updatedAt),
    createdAt: new Date(event.createdAt),
    endedAt: event.endedAt !== null ? event.endedAt : null
  }
}

export const getAttendeeCount = (conn: SQLExecutable, eventIds: string[]) => {
  return conn.queryResults<EventWithAttendeeCount>(
    ` SELECT
        attendeeCount
      FROM
        ViewEventAttendeeCount
      WHERE
        id IN (:eventIds)
      GROUP BY id`,
    { eventIds }
  )
}

export const getEventAttendanceFields = (conn: SQLExecutable, userId: string, eventIds: string[]) => {
  return conn.queryResults<EventAttendanceFields>(
    ` SELECT
        ea.joinTimestamp AS joinDate,
        ea.role AS userAttendeeStatus
      FROM
          event e
      LEFT JOIN eventAttendance ea ON ea.userId = :userId AND ea.eventId = e.id
      WHERE 
        e.id IN (:eventIds)
      GROUP BY id
      `,
    { eventIds, userId }
  )
}

const setAttendeesPreviewForEvent = (
  events: DBTifEvent[],
  attendeesPreviews: DBViewEventAttendees[],
  eventsWithAttendeeCount: EventWithAttendeeCount[],
  EventAttendanceFields: EventAttendanceFields[]
) => {
  events.sort((eventA, eventB) => {
    return eventA.id.toString().localeCompare(eventB.id.toString())
  })

  for (let i = 0; i < events.length; i++) {
    events[i].previewAttendees = attendeesPreviews[i].userIds?.split(",")
      .map(id => (
        {
          id,
          profileImageURL: null
        }
      )) ??
    []
    events[i].attendeeCount = eventsWithAttendeeCount[i].attendeeCount
      ? eventsWithAttendeeCount[i].attendeeCount
      : 0
    events[i].joinDate = EventAttendanceFields[i].joinDate
    events[i].userAttendeeStatus = EventAttendanceFields[i].userAttendeeStatus ?? "not-participating"
  }
  return events
}

export const getAttendees = (conn: SQLExecutable, eventIds: string[]) => {
  return conn.queryResults<DBViewEventAttendees>(
    `
    SELECT 
      ViewEventAttendees.userIds
FROM 
  ViewEventAttendees
WHERE 
  ViewEventAttendees.eventId IN (:eventIds)
GROUP BY 
  ViewEventAttendees.eventId
HAVING 
    COUNT(DISTINCT ViewEventAttendees.userIds) <= 3
  `,
    { eventIds }
  )
}

export const setEventAttendeesFields = (
  conn: SQLExecutable,
  events: DBTifEvent[],
  userId: string
) => {
  const eventIds = events.map((event) => event.id.toString())

  if (!eventIds.length) {
    return success([])
  }

  const eventsByRegion = getAttendees(conn, eventIds).flatMapSuccess(
    (attendeesPreviews) =>
      getAttendeeCount(conn, eventIds).flatMapSuccess((eventsWithAttendeeCount) =>
        getEventAttendanceFields(conn, userId, eventIds).mapSuccess((joinTimestampAndRoleData) =>
          setAttendeesPreviewForEvent(
            events,
            attendeesPreviews,
            eventsWithAttendeeCount,
            joinTimestampAndRoleData
          )
        )
      )
  )

  return eventsByRegion.mapSuccess((events) => {
    return events
  })
}

export const refactorEventsToMatchTifEvent = (eventsByRegion: DBTifEvent[]) => {
  const eventsRefactored = eventsByRegion.map((event) => tifEventResponseFromDatabaseEvent(event))
  return success(eventsRefactored)
}
