import { randomInt, randomUUID } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent, callGetEventChatToken } from "../test/helpers/events.js"
import { callPostUser } from "../test/helpers/users.js"
import { testEvents, testUserIdentifier } from "../test/testVariables.js"

describe("GetTokenRequest tests", () => {
  resetDatabaseBeforeEach()

  it("should return 401 if user does not exist", async () => {
    const id = randomUUID()
    const resp = await callGetEventChatToken(id, randomInt(1000))

    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ body: "user does not exist" })
  })

  it("should return 404 if the event doesnt exist", async () => {
    const resp = await callGetEventChatToken(testUserIdentifier, randomInt(1000))

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject({ body: "event does not exist" })
  })

  it("should return 404 if the user is not part of the event", async () => {
    await callPostUser(testUserIdentifier)
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
