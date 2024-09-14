import { conn } from "TiFBackendUtils"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { addLocationToDB } from "../../GeocodingLambda/utils"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("CreateEvent tests", () => {
  it("should allow a user to create an event and add them to the attendee list", async () => {
    const {
      host,
      eventResponses: [event]
    } = await createEventFlow([{}])

    expect(event).toMatchObject({
      status: 201,
      data: { id: expect.any(Number) }
    })

    const { value: attendee } = await conn.queryFirstResult<{userId: string, eventId: string}>(
      `
      SELECT *
      FROM eventAttendance
      WHERE userId = :userId
        AND eventId = :eventId;      
      `,
      { eventId: event.data.id, userId: host.id }
    )
    expect(attendee).toMatchObject({ eventId: event.data.id, userId: host.id })
  })

  it("should save the address matching the given coordinates", async () => {
    const newUser = await createUserFlow()

    const {
      eventIds
    } = await createEventFlow([
      {
        title: "test event",
        coordinates: {
          latitude: 36.98,
          longitude: -122.06
        }
      }
    ])
    const resp = await testAPI.eventDetails({ auth: newUser.auth, params: { eventId: eventIds[0] } })
    expect(resp).toMatchObject({
      status: 200,
      data: {
        id: expect.any(Number),
        location: {
          placemark: {
            city: "Westside",
            isoCountryCode: "USA",
            name: "115 Tosca Ter, Santa Cruz, CA 95060-2352, United States",
            postalCode: "95060-2352",
            street: "Tosca Ter",
            streetNumber: "115"
          },
          timezoneIdentifier: "America/Los_Angeles"
        }
      }
    })
  })

  it("should not fail if a valid address for the given coordinates can't be found", async () => {
    const newUser = await createUserFlow()

    const {
      eventIds
    } = await createEventFlow([
      {
        title: "test event",
        coordinates: {
          latitude: 25,
          longitude: 25
        }
      }
    ])
    const resp = await testAPI.eventDetails({ auth: newUser.auth, params: { eventId: eventIds[0] } })
    expect(resp).toMatchObject({
      status: 200,
      data: { id: expect.any(Number), location: { placemark: {}, timezoneIdentifier: "Africa/Cairo" } }
    })
  })

  it("should not allow a user to create an event that ends in the past", async () => {
    const newUser = await createUserFlow()
    const resp = await testAPI.createEvent({ auth: newUser.auth, body: { ...testEventInput, dateRange: dateRange(new Date("2000-01-01"), new Date("2000-01-02"))! } })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-request" }
    })
  })

  it("create event still is successful if the placemark already exists", async () => {
    const newUser = await createUserFlow()
    addLocationToDB(conn, {
      latitude: 43.839319,
      longitude: 87.526148,
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
        coordinates: {
          latitude: 43.839319,
          longitude: 87.526148
        }
      }
    ])

    const resp = await testAPI.eventDetails({ auth: newUser.auth, params: { eventId: eventIds[0] } })

    expect(resp).toMatchObject({
      status: 200,
      data: { id: expect.any(Number) }
    })
  })

  it("create event still is successful if the location is on a border of two timezones", async () => {
    const newUser = await createUserFlow()
    addLocationToDB(conn, {
      latitude: 43.839319,
      longitude: 87.526148,
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
        coordinates: {
          latitude: 43.839319,
          longitude: 87.526148
        }
      }
    ])

    const resp = await testAPI.eventDetails({ auth: newUser.auth, params: { eventId: eventIds[0] } })

    expect(resp).toMatchObject({
      status: 200,
      data: {
        id: expect.any(Number),
        location: {
          timezoneIdentifier: "Asia/Shanghai"
        }
      }
    })
  })
})
