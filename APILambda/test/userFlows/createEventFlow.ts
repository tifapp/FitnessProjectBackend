import { TiFAPIClient } from "TiFBackendUtils"
import { CreateEvent } from "TiFShared/api/models/Event"
import { EventID } from "TiFShared/domain-models/Event"
import { testAPI } from "../testApp"
import { testEventInput } from "../testEvents"
import { RegisteredTestUser, createUserFlow } from "./createUserFlow"

export const createEventFlow = async (
  eventInputs: Partial<CreateEvent>[] = [{}],
  attendeeCount: number = 0
): Promise<{
  attendeesList: RegisteredTestUser[]
  host: RegisteredTestUser
  eventResponses: Awaited<ReturnType<TiFAPIClient["createEvent"]>>[]
  eventIds: number[]
}> => {
  const host = await createUserFlow()

  if (eventInputs.length < 1) {
    throw new Error("need at least one test event input")
  }

  const eventResponses = await Promise.all(
    eventInputs.map((details) =>
      testAPI.createEvent({ auth: host.auth, body: { ...testEventInput, ...details } })
    )
  )

  const eventIds = eventResponses.map((event) => {
    if (event.status === 201) { return event.data.id } else { console.error(event); throw new Error("invalid test event given") }
  })

  const attendeesList: RegisteredTestUser[] = []
  attendeesList.push(host)

  for (let i = 0; i < attendeeCount; i++) {
    const attendee = await createUserFlow()
    attendeesList.push(attendee)

    for (const eventId of eventIds) {
      await testAPI.joinEvent({ auth: attendee.auth, params: { eventId: eventId as EventID }, body: undefined })
    }
  }

  return {
    attendeesList,
    host,
    eventResponses,
    eventIds
  }
}
