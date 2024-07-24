import { ColorString } from "TiFShared/domain-models/ColorString"
import { dateRange, FixedDateRange } from "TiFShared/domain-models/FixedDateRange"
import { Placemark } from "TiFShared/domain-models/Placemark"
import { UnblockedBidirectionalUserRelations, UserHandle, UserID } from "TiFShared/domain-models/User"
import { success } from "TiFShared/lib/Result"
import dayjs from "dayjs"
import duration from "dayjs/plugin/duration"
import { DBevent, DBeventAttendance, DBEventAttendeeCountView, DBEventAttendeesView, DBTifEventView, DBuserRelations } from "./DBTypes"
import { MySQLExecutableDriver } from "./MySQLDriver/index"
dayjs.extend(duration)

// Get the total seconds in the duration
export const SECONDS_IN_DAY = dayjs.duration(1, "day").asSeconds()
export const ARRIVAL_RADIUS_IN_METERS = 120

export type DBupcomingEvent = DBevent & {hasArrived: boolean}
export type UserHostRelations = "not-friends" | "friend-request-pending" | "friends" | "blocked" | "current-user"
export type TodayOrTomorrow = "today" | "tomorrow"
export type UserAttendeeStatus = DBeventAttendance["role"] | "not-participating"
export type Attendee = { id: string, profileImageURL?: string}
export type DBTifEvent = DBTifEventView & Omit<DBuserRelations, "status" | "updatedDateTime"> &
{ attendeeCount: number, previewAttendees: Attendee[], userAttendeeStatus: UserAttendeeStatus, joinedDateTime: Date } & UnblockedBidirectionalUserRelations

export type TiFEvent = {
    id: number
    title: string
    description: string
    attendeeCount: number
    color: ColorString
    time: {
      secondsToStart: number
      dateRange: FixedDateRange
      todayOrTomorrow?: TodayOrTomorrow
    }
    previewAttendees: Attendee[]
    location: {
      coordinate: {
        latitude: number,
        longitude: number
      },
      timezoneIdentifier: string,
      placemark?: Omit<Placemark, "latitude" | "longitude">,
      arrivalRadiusMeters: number
      isInArrivalTrackingPeriod: boolean
    }
    host: {
      relations: UnblockedBidirectionalUserRelations
      id: UserID
      username: string
      handle: UserHandle
      profileImageURL?: string
      name: string
      joinedDateTime: Date
      arrivedDateTime: Date
    }
    settings: {
      shouldHideAfterStartDate: boolean
      isChatEnabled: boolean
    }
    isChatExpired: boolean
    userAttendeeStatus: UserAttendeeStatus
    joinedDateTime?: Date
    hasArrived: boolean
    updatedDateTime: Date
    createdDateTime: Date
    endedDateTime?: Date
  }

export const calcSecondsToStart = (startDateTime: Date) => {
  const millisecondsToStart = startDateTime.valueOf() - new Date().valueOf()
  return millisecondsToStart / 1000
}

const isChatExpired = (endedDateTime?: Date) => {
  if (endedDateTime == null) {
    return false
  }

  const chatEndedDateendedDateTime = dayjs(endedDateTime)
  const nextDay = chatEndedDateendedDateTime.add(1, "day")

  const diffInHours = nextDay.diff(endedDateTime, "hour")

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
    return undefined
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
      dateRange: dateRange(event.startDateTime, event.endDateTime)!,
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
      timezoneIdentifier: event.timezoneIdentifier ?? "",
      arrivalRadiusMeters: ARRIVAL_RADIUS_IN_METERS,
      isInArrivalTrackingPeriod: calcSecondsToStart(event.startDateTime) < SECONDS_IN_DAY
    },
    host: {
      relations: {
        fromThemToYou: event.fromThemToYou,
        fromYouToThem: event.fromYouToThem
      } as UnblockedBidirectionalUserRelations,
      id: event.hostId,
      username: event.hostUsername,
      handle: event.hostHandle,
      profileImageURL: undefined,
      name: "TODO: FIX",
      joinedDateTime: new Date(10000), // TODO: FIX
      arrivedDateTime: new Date(10000) // TODO: FIX
    },
    settings: {
      shouldHideAfterStartDate: event.shouldHideAfterStartDate,
      isChatEnabled: event.isChatEnabled
    },
    userAttendeeStatus: event.userAttendeeStatus,
    joinedDateTime: event.joinedDateTime,
    isChatExpired: isChatExpired(event.endedDateTime),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    hasArrived: event.hasArrived === 1,
    updatedDateTime: new Date(event.updatedDateTime),
    createdDateTime: new Date(event.createdDateTime),
    endedDateTime: event.endedDateTime
  }
}

export const getAttendeeCount = (conn: MySQLExecutableDriver, eventIds: string[]) => {
  return conn.queryResult<DBEventAttendeeCountView>(
    ` SELECT
        attendeeCount
      FROM
        EventAttendeeCountView
      WHERE
        id IN (:eventIds)
      GROUP BY id`,
    { eventIds }
  )
}

export const getEventAttendanceFields = (conn: MySQLExecutableDriver, userId: string, eventIds: string[]) => {
  return conn.queryResult<DBeventAttendance>(
    ` SELECT
        ea.joinedDateTime AS joinedDateTime,
        ea.role AS role
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
  attendeesPreviews: DBEventAttendeesView[],
  eventsWithAttendeeCount: DBEventAttendeeCountView[],
  EventAttendanceFields: DBeventAttendance[]
) => {
  events.sort((eventA, eventB) => {
    return eventA.id.toString().localeCompare(eventB.id.toString())
  })

  for (let i = 0; i < events.length; i++) {
    events[i].previewAttendees = attendeesPreviews[i].userIds?.split(",")
      .map(id => (
        {
          id,
          profileImageURL: undefined
        }
      )) ??
    []
    events[i].attendeeCount = eventsWithAttendeeCount[i].attendeeCount
      ? eventsWithAttendeeCount[i].attendeeCount
      : 0
    events[i].joinedDateTime = EventAttendanceFields[i].joinedDateTime
    events[i].userAttendeeStatus = EventAttendanceFields[i].role ?? "not-participating"
  }
  return events
}

export const getAttendees = (conn: MySQLExecutableDriver, eventIds: string[]) => {
  return conn.queryResult<DBEventAttendeesView>(
    `
    SELECT 
      EventAttendeesView.userIds
FROM 
  EventAttendeesView
WHERE 
  EventAttendeesView.eventId IN (:eventIds)
GROUP BY 
  EventAttendeesView.eventId
HAVING 
    COUNT(DISTINCT EventAttendeesView.userIds) <= 3
  `,
    { eventIds }
  )
}

export const setEventAttendeesFields = (
  conn: MySQLExecutableDriver,
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
