import {
  callCreateEvent,
  callJoinEvent,
  callLeaveEvent
} from "../test/apiCallers/events.js"
import { testEvent } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Leave event tests", () => {
  it("should return 204 if user leaves the event", async () => {
    const { token: eventOwnerToken } = await createUserFlow()
    const { token: attendeeToken } = await createUserFlow()

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    await callJoinEvent(attendeeToken, parseInt(event.body.id))
    const resp = await callLeaveEvent(attendeeToken, event.body.id)

    expect(resp).toMatchObject({
      status: 204
    })
  })

  it("should return 400 if host leaves own event and co-host does not exist", async () => {
    const { token: eventOwnerToken } = await createUserFlow()

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    const resp = await callLeaveEvent(eventOwnerToken, event.body.id)

    expect(resp).toMatchObject({
      status: 400,
      body: { error: "co-host-not-found" }
    })
  })
})
