import { EventColor } from "../events/models.js"

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
}

export type EventAttendee = {
  userIds: string
  eventId: number
}

export type EventAttendeeCount = {
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
