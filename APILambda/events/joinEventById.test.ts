import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent, callJoinEvent } from "../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"

describe("Join the event by id tests", () => {
  resetDatabaseBeforeEach()
  console.log("Running the join event tests")

  // Happy Path
  it("should return 200 when the user is able to successfully join the event", async () => {
    const eventOwnerToken = await createUserAndUpdateAuth(global.defaultUser2.auth)
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const testEvent = { ...testEvents[0], endTimestamp: futureDate }
    const event = await callCreateEvent(eventOwnerToken, testEvent)
    const resp = await callJoinEvent(global.defaultUser.auth, parseInt(event.body.id))
    expect(resp.status).toEqual(200)
  })
})
