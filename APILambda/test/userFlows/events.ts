import { CreateEventInput } from "../../events/createEvent.js"
import { callCreateEvent, callJoinEvent } from "../apiCallers/events.js"
import { testEvent } from "../testEvents.js"
import { createUserFlow } from "./users.js"

export const createEventFlow = async (
  eventInput: Partial<CreateEventInput>[]
): Promise<{
  attendeeToken: string
  attendeeId: string
  hostId: string
  hostToken: string
  eventIds: number[]
}> => {
  const { token: hostToken, userId: hostId } = await createUserFlow()
  const { token: attendeeToken, userId: attendeeId } = await createUserFlow()

  const eventPromises = await Promise.all(
    eventInput.map((details) =>
      callCreateEvent(hostToken, { ...testEvent, ...details })
    )
  )

  const eventIds = eventPromises.map((event) => parseInt(event.body.id))

  await Promise.all(
    eventIds.map((eventId) => callJoinEvent(attendeeToken, eventId))
  )

  return { attendeeToken, attendeeId, hostId, hostToken, eventIds }
}
