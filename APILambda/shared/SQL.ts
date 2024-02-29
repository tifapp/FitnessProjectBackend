export type PaginatedAttendeesResponse = {
  nextPageCursor: string
  totalAttendeeCount: number
  attendees: DatabaseAttendee[]
}

export type AttendeesCursorResponse = {
  userId: string
  joinDate: Date | null
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

// add with valid user check to some
