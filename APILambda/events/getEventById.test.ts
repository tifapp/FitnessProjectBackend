import { randomInt } from "crypto"
import { callGetEvent } from "../test/helpers/events.js"
import { testAuthorizationHeader } from "../test/testVariables.js"

describe("GetSingleEvent tests", () => {
  it("should return 404 if the event doesnt exist", async () => {
    const eventId = randomInt(1000)
    const resp = await callGetEvent(testAuthorizationHeader, eventId)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject({ error: "event-not-found", eventId })
  })
})