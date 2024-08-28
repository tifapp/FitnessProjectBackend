import { CreateEventInput } from "../../events/createEvent"
import { callCreateEvent, callJoinEvent } from "../apiCallers/events"
import { delay } from "../helpers/delay"
import { testEnvVars } from "../testEnv"
import { testEventInput } from "../testEvents"
import { TestUser, createUserFlow } from "./users"

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

  const eventIds = eventResponses.map((event, i) => {
    if (event.ok) { return parseInt(event.body.id) } else { console.error(eventInputs[i]); console.error(event); throw new Error("invalid test event given") }
  })

  const attendeesList: TestUser[] = []
  attendeesList.push(host)

  for (let i = 0; i < attendeeCount; i++) {
    const attendee = await createUserFlow()
    attendeesList.push(attendee)

    for (const eventId of eventIds) {
      // delay needed for test attendees to be properly sorted by join time
      if (!testEnvVars.API_ENDPOINT) { await delay(1000) }
      await callJoinEvent(attendee.token, eventId)
    }
  }

  return {
    attendeesList,
    host,
    eventResponses,
    eventIds
  }
}
