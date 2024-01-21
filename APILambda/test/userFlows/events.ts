import { CreateEventInput } from "../../events/createEvent.js"
import { callCreateEvent, callJoinEvent } from "../apiCallers/events.js"
import { testEventInput } from "../testEvents.js"
import { createUserFlow } from "./users.js"

export const createEventFlow = async (
  eventInput: Partial<CreateEventInput>[]
): Promise<{
  attendeeToken: string
  attendeeId: string
  attendeeName: string
  attendeeHandle: string
  hostToken: string
  hostId: string
  hostName: string
  hostHandle: string
  eventIds: number[]
}> => {
  const {
    token: hostToken,
    userId: hostId,
    handle: hostHandle,
    name: hostName
  } = await createUserFlow()
  const {
    token: attendeeToken,
    userId: attendeeId,
    handle: attendeeHandle,
    name: attendeeName
  } = await createUserFlow()

  const eventPromises = await Promise.all(
    eventInput.map((details) =>
      callCreateEvent(hostToken, { ...testEventInput, ...details })
    )
  )

  const eventIds = eventPromises.map((event) => parseInt(event.body.id))

  await Promise.all(
    eventIds.map((eventId) => callJoinEvent(attendeeToken, eventId))
  )

  return {
    attendeeToken,
    attendeeId,
    attendeeName,
    attendeeHandle,
    hostId,
    hostToken,
    hostHandle,
    hostName,
    eventIds
  }
}
