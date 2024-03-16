import { CreateEventInput } from "../../events/createEvent.js"
import { callCreateEvent, callJoinEvent } from "../apiCallers/events.js"
import { testEventInput } from "../testEvents.js"
import { TestUser, createUserFlow } from "./users.js"

export const createEventFlow = async (
  eventInputs: Partial<CreateEventInput>[] = [{}],
  attendeeCount: number = 0
): Promise<{
  attendeesList: TestUser[]
  host: TestUser
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   eventResponses: any
  eventIds: number[]
}> => {
  const host = await createUserFlow()

  if (eventInputs.length < 1) {
    throw new Error("need at least one test event input")
  }

  const eventResponses = await Promise.all(
    eventInputs.map((details) =>
      callCreateEvent(host.token, { ...testEventInput, ...details })
    )
  )

  const eventIds = eventResponses.map((event) => {
    if (event.ok) { return parseInt(event.body.id) } else { throw new Error("invalid test event given") }
  })

  const attendeesList = []
  attendeesList.push(host)

  for (let i = 0; i < attendeeCount; i++) {
    const attendee = await createUserFlow()

    attendeesList.push(attendee)

    await Promise.all(
      eventIds.map((eventId) => callJoinEvent(attendee.token, eventId))
    )
  }

  return {
    attendeesList,
    host,
    eventResponses,
    eventIds
  }
}
