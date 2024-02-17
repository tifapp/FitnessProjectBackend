import {
  SearchForPositionResultToPlacemark,
  addPlacemarkToDB,
  conn
} from "TiFBackendUtils"
import { find } from "geo-tz"
import { callCreateEvent, callGetEvent } from "../test/apiCallers/events.js"
import { missingAddressTestLocation } from "../test/testApp.js"
import { testEventInput } from "../test/testEvents.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("CreateEvent tests", () => {
  it("should allow a user to create an event and add them to the attendee list", async () => {
    const { token, userId } = await createUserFlow()
    const createEventResponse = await callCreateEvent(token, testEventInput)
    const timeZone = find(testEventInput.latitude, testEventInput.longitude)

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
    const resp = await callGetEvent(token, createEventResponse.body.id)
    expect(resp.body.timeZone).toEqual(timeZone[0])
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
      ...testEventInput,
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
  it("create event still is successful if the placemark already exists", async () => {
    const { token } = await createUserFlow()
    const placemark = SearchForPositionResultToPlacemark({
      latitude: testEventInput.latitude,
      longitude: testEventInput.longitude
    })
    const timeZone = find(testEventInput.latitude, testEventInput.longitude)[0]
    addPlacemarkToDB(conn, placemark, timeZone)
    const event = await callCreateEvent(token, {
      ...testEventInput,
      startTimestamp: new Date("2050-01-01"),
      endTimestamp: new Date("2050-01-02")
    })

    expect(event).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
  })

  // Test that the create event still is successful if the location is on a border of two timezones
  it("create event still is successful if the location is on a border of two timezones", async () => {
    const { token } = await createUserFlow()

    // Coordinates for the timezone border of ['Asia/Shanghai', 'Asia/Urumqi']
    const placemark = SearchForPositionResultToPlacemark({
      latitude: 43.839319,
      longitude: 87.526148
    })
    const timeZone = find(43.839319, 87.526148)[0]
    addPlacemarkToDB(conn, placemark, timeZone)
    const event = await callCreateEvent(token, {
      ...testEvent,
      latitude: 43.839319,
      longitude: 87.526148,
      startTimestamp: new Date("2050-01-01"),
      endTimestamp: new Date("2050-01-02")
    })

    expect(event).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
    const resp = await callGetEvent(token, event.body.id)
    expect(resp.body.timeZone).toEqual(timeZone)
  })
})
