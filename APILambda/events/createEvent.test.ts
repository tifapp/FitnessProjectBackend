import { conn } from "TiFBackendUtils"
import { callCreateEvent } from "../test/apiCallers/events.js"
import { testEventInput } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("CreateEvent tests", () => {
  it("should allow a user to create an event and add them to the attendee list", async () => {
    const { token, userId } = await createUserFlow()
    const createEventResponse = await callCreateEvent(token, testEventInput)
    expect(createEventResponse).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
    expect(parseInt(createEventResponse.body.id)).not.toBeNaN()

    const { value: attendee } = await conn.queryFirstResult<{
      userId: string
      eventId: string
    }>(
      `
      SELECT *
      FROM eventAttendance
      WHERE userId = :userId
        AND eventId = :eventId;      
      `,
      { eventId: parseInt(createEventResponse.body.id), userId }
    )
    expect(attendee).toMatchObject({
      eventId: parseInt(createEventResponse.body.id),
      userId
    })
  })

  it("should not allow a user to create an event that ends in the past", async () => {
    const { token } = await createUserFlow()
    const resp = await callCreateEvent(token, { ...testEventInput, startTimestamp: new Date("2000-01-01"), endTimestamp: new Date("2000-01-02") })
    expect(resp).toMatchObject({
      status: 400,
      body: { error: "invalid-request" }
    })
  })

  // Should return a failure if the placemark exists in the db

  // Should return a success when adding a placemark in the db that didn't exist prior
})
