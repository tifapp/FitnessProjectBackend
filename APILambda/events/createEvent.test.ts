import {
  conn
} from "TiFBackendUtils"
import dayjs from "dayjs"
import { addPlacemarkToDB } from "../../GeocodingLambda/utils.js"
import { callCreateEvent, callGetEvent } from "../test/apiCallers/events.js"
import { testEventInput } from "../test/testEvents.js"
import { createEventFlow } from "../test/userFlows/events.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("CreateEvent tests", () => {
  it("should allow a user to create an event and add them to the attendee list", async () => {
    const {
      host,
      eventResponses
    } = await createEventFlow([{}])
    expect(eventResponses[0]).toMatchObject({
      status: 201,
      body: { id: expect.anything() }
    })
    expect(parseInt(eventResponses[0].body.id)).not.toBeNaN()

    const { value: attendee } = await conn.queryFirstResult<{userId: string, eventId: string}>(
      `
      SELECT *
      FROM eventAttendance
      WHERE userId = :userId
        AND eventId = :eventId;      
      `,
      { eventId: parseInt(eventResponses[0].body.id), userId: host.userId }
    )
    expect(attendee).toMatchObject({ eventId: parseInt(eventResponses[0].body.id), userId: host.userId })
  })

  it("should invoke the aws lambda for creating an event", async () => {
    const { token } = await createUserFlow()
    addPlacemarkToDB(conn, {
      lat: 36.98,
      lon: -122.06,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      streetNumber: "1234"
    }, "Sample/Timezone")
    const {
      eventIds
    } = await createEventFlow([
      {
        title: "test event",
        latitude: 36.98,
        longitude: -122.06,
        startDateTime: dayjs().subtract(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      }
    ])
    const resp = await callGetEvent(token, eventIds[0])
    expect(resp).toMatchObject({
      status: 200,
      body: { id: expect.anything(), location: { placemark: { city: expect.anything(), country: expect.anything() } } }
    })
    expect(parseInt(resp.body.id)).not.toBeNaN()
  })

  it("should not allow a user to create an event that ends in the past", async () => {
    const { token } = await createUserFlow()
    const resp = await callCreateEvent(token, { ...testEventInput, startDateTime: new Date("2000-01-01"), endDateTime: new Date("2000-01-02") })
    expect(resp).toMatchObject({
      status: 400,
      body: { error: "invalid-request" }
    })
  })

  it("create event still is successful if the placemark already exists", async () => {
    const { token } = await createUserFlow()
    addPlacemarkToDB(conn, {
      lat: testEventInput.latitude,
      lon: testEventInput.longitude,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      streetNumber: "1234"
    }, "Sample/Timezone")
    const {
      eventIds
    } = await createEventFlow([
      {
        title: "test event",
        latitude: 43.839319,
        longitude: 87.526148,
        startDateTime: new Date("2050-01-01"),
        endDateTime: new Date("2050-01-02")
      }
    ])

    const resp = await callGetEvent(token, eventIds[0])

    expect(resp).toMatchObject({
      status: 200,
      body: { id: expect.anything() }
    })
  })

  it("create event still is successful if the location is on a border of two timezones", async () => {
    const { token } = await createUserFlow()
    addPlacemarkToDB(conn, {
      lat: 43.839319,
      lon: 87.526148,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      streetNumber: "1234"
    }, "Asia/Shanghai")
    const {
      eventIds
    } = await createEventFlow([
      {
        title: "test event",
        // Coordinates for the timezone border of ['Asia/Shanghai', 'Asia/Urumqi']
        latitude: 43.839319,
        longitude: 87.526148,
        startDateTime: new Date("2050-01-01"),
        endDateTime: new Date("2050-01-02")
      }
    ])

    const resp = await callGetEvent(token, eventIds[0])

    expect(resp).toMatchObject({
      status: 200,
      body: { id: expect.anything() }
    })

    console.log("Here is the response ", resp.body)
    expect(resp.body.time.timeZoneIdentifier).toEqual("Asia/Shanghai")
  })
})
