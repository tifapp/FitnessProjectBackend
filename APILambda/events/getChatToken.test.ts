import { randomInt, randomUUID } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database"
import { callCreateEvent, callGetEventChatToken } from "../test/helpers/events"
import { callPostUser } from "../test/helpers/users"
import { testEvents, testUserIdentifier, testUsers } from "../test/testVariables"

describe("GetTokenRequest tests", () => {
  resetDatabaseBeforeEach()

  it("should return 404 if the event doesnt exist", async () => {
    const eventId = randomInt(1000)
    const id = randomUUID()
    const resp = await callGetEventChatToken(id, eventId)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject({ body: "event does not exist" })
  })

  it("should return 404 if the user is not part of the event", async () => {
    await callPostUser(testUserIdentifier, testUsers[0])
    const event = await callCreateEvent(testUserIdentifier, testEvents[0])

    // check if user exists too
    const id = randomUUID()
    const resp = await callGetEventChatToken(id, event.body.id)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject({ body: "user is not apart of event" })
  })

  // test all error cases
  // test success case
  // unit test getRole() function
})
