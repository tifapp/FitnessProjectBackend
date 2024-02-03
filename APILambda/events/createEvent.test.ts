import {
  SearchForPositionResultToPlacemark,
  addPlacemarkToDB,
  conn
} from "TiFBackendUtils"
import { callCreateEvent } from "../test/apiCallers/events.js"
import { testEventInput } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"
import { missingAddressTestLocation } from "../test/testApp.js"

describe("CreateEvent tests", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

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

  // Test when the geocoding fails that it utilizes geocoding lambda
  // Note: We will need to mock the SearchForPositionResultToPlacemark function
  it("should invoke the aws lambda for creating an event if the SearchForPositionResultToPlacemark fails", async () => {
    const { token } = await createUserFlow()

    const createEventResponse = await callCreateEvent(token, {
      ...testEvent,
      latitude: missingAddressTestLocation.latitude,
      longitude: missingAddressTestLocation.longitude
    })
    expect(createEventResponse).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
    expect(parseInt(createEventResponse.body.id)).not.toBeNaN()
  })

  // Test that the create event still is successful if the placemark already exists
  it("adds placemark in the location table if it does already exist", async () => {
    const { token } = await createUserFlow()
    const placemark = SearchForPositionResultToPlacemark({
      latitude: testEvent.latitude,
      longitude: testEvent.longitude
    })

    addPlacemarkToDB(conn, placemark)
    const event = await callCreateEvent(token, {
      ...testEvent,
      startTimestamp: new Date("2050-01-01"),
      endTimestamp: new Date("2050-01-02")
    })

    expect(event).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
  })
})
