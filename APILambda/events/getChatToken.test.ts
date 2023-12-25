import { randomInt } from "crypto"
import {
  callCreateEvent,
  callGetEventChatToken
} from "../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"

describe("GetTokenRequest tests", () => {
  // TODO: Make shared util for this
  // it("should return 401 if user does not exist", async () => {
  //   const resp = await callGetEventChatToken(global.defaultUser.auth, randomInt(1000))

  //   expect(resp.status).toEqual(401)
  //   expect(resp.body).toMatchObject({ body: "user does not exist" })
  // })

  it("should return 404 if the event doesnt exist", async () => {
    const userToken = await createUserAndUpdateAuth(global.defaultUser)
    const resp = await callGetEventChatToken(
      userToken,
      randomInt(1000)
    )

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" }
    })
  })

  it("should return 404 if the user is not part of the event", async () => {
    const userToken = await createUserAndUpdateAuth(global.defaultUser)
    const event = await callCreateEvent(userToken, testEvents[0])

    const user2Token = await createUserAndUpdateAuth(global.defaultUser2)
    const resp = await callGetEventChatToken(user2Token, event.body.id)

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "user-not-attendee" }
    })
  })

  // test all error cases
  // test success case
  // unit test getRole() function
})
