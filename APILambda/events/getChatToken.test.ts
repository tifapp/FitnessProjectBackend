import { randomInt } from "crypto"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent, callGetEventChatToken } from "../test/helpers/events.js"
import { callPostUser } from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"

describe("GetTokenRequest tests", () => {
  resetDatabaseBeforeEach()

  // TODO: Make shared util for this
  // it("should return 401 if user does not exist", async () => {
  //   const resp = await callGetEventChatToken(global.defaultUser.auth, randomInt(1000))

  //   expect(resp.status).toEqual(401)
  //   expect(resp.body).toMatchObject({ body: "user does not exist" })
  // })

  it("should return 404 if the event doesnt exist", async () => {
    const resp = await callGetEventChatToken(global.defaultUser.auth, randomInt(1000))

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject({ body: "event does not exist" })
  })

  it("should return 404 if the user is not part of the event", async () => {
    await callPostUser(global.defaultUser.auth)
    const event = await callCreateEvent(global.defaultUser.auth, testEvents[0])

    // check if user exists too
    const user = await global.registerUser()
    const resp = await callGetEventChatToken(user.auth, event.body.id)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject({ body: "user is not apart of event" })
  })

  // test all error cases
  // test success case
  // unit test getRole() function
})
