import { EventColor } from "../events/models.js"

type UserHostRelations = "not friends" | "friend-request-pending" | "friends" | "blocked"
type TodayOrTomorrow = "today" | "tomorrow"
type Role = "host" | "attendee" | "not-participating"

export type DatabaseEvent = {
  id: string
  relationUserToHost: string
  relationHostToUser: string
  hostId: string
  title: string
  description: string
  startTimestamp: Date
  endTimestamp: Date
  color: EventColor
  latitude: number
  longitude: number
  shouldHideAfterStartDate: boolean
  isChatEnabled: boolean
  arrivalStatus: string
}

export type TiFEvent = {
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
  todayOrTomorrow?: TodayOrTomorrow // Need to calculate
  previewAttendees: EventAttendee[]
  latitude: number
  longitude: number
  name?: string
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
  username?: string // Use a default?
  handle?: string // Use a default?
  profileImageURL?: string // Can't find in any table?
  shouldHideAfterStartDate: boolean
  isChatEnabled: boolean
  userAttendeeStatus: Role // Get from Henry's PR
  joinDate?: Date
  isChatExpired?: boolean // How do we determine this?
  hasArrived: boolean // check userArrivals table
  updatedAt: Date
  createdAt?: Date // Can't find this field in the events table
}

export type TiFEventFinal = {
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
     todayOrTomorrow?: TodayOrTomorrow // Need to calculate
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
  }
  userAttendeeStatus: Role // Get from Henry's PR
  joinDate?: Date
  isChatExpired?: boolean // How do we determine this?
  hasArrived: boolean // check userArrivals table
  updatedAt: Date
  createdAt?: Date // Can't find this field in the events table
}

export type DatabaseAttendee = {
  id: string
  name: string
  joinTimestamp: Date
  profileImageURL?: string
  handle: string
  arrivalStatus: boolean
  arrivedAt: Date
}

export type PaginatedAttendeesResponse = {
  nextPageCursor: string
  attendeesCount: number
  attendees: DatabaseAttendee[]
}

export type AttendeesCursorResponse = {
  userId: string,
  joinDate: Date | null,
  arrivedAt: Date | null
}

export type EventAttendee = {
  userIds: string
  eventId: number
}

export type EventWithAttendeeCount = {
  eventId: number
  attendeeCount: number
}

export type GetEventByRegionEvent = {
  id: number
  hostId: string
  title: string
  description: string
  startTimestamp: Date
  endTimestamp: Date
  color: EventColor
  latitude: number
  longitude: number
  shouldHideAfterStartDate: boolean
  isChatEnabled: boolean
  relationUserToHost: string
  relationHostToUser: string
  name: string
  city: string
  country: string
  street: string
  street_num: number
  totalAttendees: number
  attendeesPreview: EventAttendee[]
  hostName: string
  hostHandle: string
  hostProfileImageURL: string
}

// add withvalidatedrequest middleware to all
// add with valid user check to some
