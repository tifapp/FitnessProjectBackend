import dayjs from "dayjs"
import duration from "dayjs/plugin/duration"
import { ColorString } from "TiFShared/domain-models/ColorString"
import {
  dateRange,
  FixedDateRange
} from "TiFShared/domain-models/FixedDateRange"
import { Placemark } from "TiFShared/domain-models/Placemark"
import {
  UnblockedUserRelationsStatus,
  UserHandle,
  UserID
} from "TiFShared/domain-models/User"
import {
  calcSecondsToStart,
  calcTodayOrTomorrow,
  isDayAfter
} from "../dateUtils"
import {
  DBevent,
  DBeventAttendance,
  DBTifEventView,
  DBuserRelationships
} from "../DBTypes"
import { UserRelations, UserRelationsSchema } from "../TiFUserUtils"

dayjs.extend(duration)

// Get the total seconds in the duration
export const SECONDS_IN_DAY = dayjs.duration(1, "day").asSeconds()
export const ARRIVAL_RADIUS_IN_METERS = 120

export type DBupcomingEvent = DBevent & { hasArrived: boolean }
export type UserHostRelations =
  | "not-friends"
  | "friend-request-pending"
  | "friends"
  | "blocked"
  | "current-user"
export type TodayOrTomorrow = "today" | "tomorrow"
export type UserAttendeeStatus = DBeventAttendance["role"] | "not-participating"
export type Attendee = { id: string; profileImageURL?: string }
export type DBTifEvent = DBTifEventView &
  Omit<DBuserRelationships, "status" | "updatedDateTime"> & {
    attendeeCount: number
    previewAttendees: Attendee[]
    userAttendeeStatus: UserAttendeeStatus
    joinedDateTime: Date
  } & UserRelations

export type TiFEvent = {
  id: number
  title: string
  description?: string
  attendeeCount: number
  color?: ColorString
  time: {
    secondsToStart: number
    dateRange: FixedDateRange
    todayOrTomorrow?: TodayOrTomorrow
  }
  previewAttendees: Attendee[]
  location: {
    coordinate: {
      latitude: number
      longitude: number
    }
    timezoneIdentifier: string
    placemark?: Omit<Placemark, "latitude" | "longitude">
    arrivalRadiusMeters: number
    isInArrivalTrackingPeriod: boolean
  }
  host: {
    relationStatus: UnblockedUserRelationsStatus
    id: UserID
    name: string
    handle: UserHandle
    profileImageURL?: string
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

export const tifEventResponseFromDatabaseEvent = (
  event: DBTifEvent
): TiFEvent => {
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
      isInArrivalTrackingPeriod:
        calcSecondsToStart(event.startDateTime) < SECONDS_IN_DAY
    },
    host: {
      relationStatus: UserRelationsSchema.parse({
        fromThemToYou: event.fromThemToYou,
        fromYouToThem: event.fromYouToThem
      }) as UnblockedUserRelationsStatus,
      id: event.hostId,
      name: event.hostName,
      handle: event.hostHandle,
      profileImageURL: undefined
    },
    settings: {
      shouldHideAfterStartDate: event.shouldHideAfterStartDate,
      isChatEnabled: event.isChatEnabled
    },
    userAttendeeStatus: event.userAttendeeStatus,
    joinedDateTime: event.joinedDateTime,
    isChatExpired: isDayAfter(event.endedDateTime),
    hasArrived: event.hasArrived,
    updatedDateTime: event.updatedDateTime,
    createdDateTime: event.createdDateTime,
    endedDateTime: event.endedDateTime
  }
}
