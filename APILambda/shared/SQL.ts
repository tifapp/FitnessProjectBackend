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

// add withvalidatedrequest middleware to all
// add with valid user check to some
