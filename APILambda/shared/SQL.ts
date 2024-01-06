import { EventColor } from "../events/models.js"

export type DatabaseEvent = {
  id: string
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

export type DatabaseAttendee = {
  id: string
  profileImageUrl: string
  name: string
  handle: string
  joinTimestamp: string
  youToThemStatus: string,
  themToYouStatus: string
}

export type Cursor = {
  userId: string
  joinDate: string
}

// add withvalidatedrequest middleware to all
// add with valid user check to some
