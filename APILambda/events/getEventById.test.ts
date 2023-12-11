import { randomInt } from "crypto"
import { callGetEvent } from "../test/helpers/events.js"
import { createUserAndUpdateAuth } from "../test/helpers/users.js"

describe("GetSingleEvent tests", () => {
  it("should return 404 if the event doesnt exist", async () => {
    const token = await createUserAndUpdateAuth(global.defaultUser)
    const eventId = randomInt(1000)
    const resp = await callGetEvent(token, eventId)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" }
    })
  })
})
