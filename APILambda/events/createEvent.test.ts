import { dayjs } from "TiFShared/lib/Dayjs"
import { handler } from "../../GeocodingLambda/handler"
import { overrideDevEnv } from "../test/devIndex"
import { addMockLocationToDB } from "../test/location"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("CreateEvent tests", () => {
  // integration test, should skip or modify for local tests
  it("should allow a user to create an event and add them to the attendee list", async () => {
    overrideDevEnv({
      geocode: handler
    })

    const startDateTime = dayjs(new Date()).millisecond(0).toDate().ext.addSeconds(10)
    const {
      host,
      eventResponses: [event]
    } = await createEventFlow([
      {
        startDateTime,
        duration: 3600,
        location: {
          type: "coordinate",
          value: {
            latitude: 36.99813840222285,
            longitude: -122.05564377465653
          }
        }
      }
    ])

    expect(event.data.endedDateTime).toEqual(undefined)
    expect(event).toMatchObject({
      status: 201,
      data: {
        id: expect.any(Number),
        title: testEventInput.title,
        description: testEventInput.description,
        host: { id: host.id, name: host.name },
        userAttendeeStatus: "hosting",
        joinedDateTime: expect.any(String),
        hasArrived: false,
        attendeeCount: 1,
        previewAttendees: [
          expect.objectContaining({
            id: host.id,
            name: host.name,
            role: "hosting"
          })
        ],
        time: {
          todayOrTomorrow: "today",
          dateRange: {
            startDateTime: dayjs(startDateTime).toDate().toISOString(),
            endDateTime: dayjs(startDateTime)
              .add(1, "hour")
              .toDate()
              .toISOString()
          }
        },
        location: {
          placemark: {
            city: "Westside",
            isoCountryCode: "USA",
            name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
            postalCode: "95064",
            street: "Hagar Dr",
            streetNumber: "420"
          },
          timezoneIdentifier: "America/Los_Angeles"
        }
      }
    })
  })

  it("should allow a user to create an event with a placemark", async () => {
    overrideDevEnv({
      geocode: handler
    })

    const {
      eventResponses: [event]
    } = await createEventFlow([
      {
        location: {
          type: "placemark",
          value: {
            city: "Westside",
            isoCountryCode: "USA",
            name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
            postalCode: "95064",
            street: "Hagar Dr",
            streetNumber: "420"
          }
        }
      }
    ])

    expect(event).toMatchObject({
      status: 201,
      data: {
        id: expect.any(Number),
        location: {
          coordinate: {
            latitude: expect.closeTo(36.9981),
            longitude: expect.closeTo(-122.0556)
          },
          timezoneIdentifier: "America/Los_Angeles"
        }
      }
    })
  })

  it("should not fail if a valid address for the given coordinates can't be found", async () => {
    const newUser = await createUserFlow()

    const { eventIds } = await createEventFlow([
      {
        title: "test event",
        location: {
          type: "coordinate",
          value: {
            latitude: 25,
            longitude: 25
          }
        }
      }
    ])
    const resp = await testAPI.eventDetails({
      auth: newUser.auth,
      params: { eventId: eventIds[0] }
    })
    expect(resp).toMatchObject({
      status: 200,
      data: {
        id: expect.any(Number),
        location: { placemark: {}, timezoneIdentifier: "Africa/Cairo" }
      }
    })
  })

  it("should not allow a user to create an event that's shorter than 60 seconds", async () => {
    const newUser = await createUserFlow()
    const resp = await testAPI.createEvent({
      auth: newUser.auth,
      body: {
        ...testEventInput,
        duration: 59
      }
    })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-request" }
    })
  })

  it("should not allow a user to create an event that ends in the past", async () => {
    const newUser = await createUserFlow()
    const resp = await testAPI.createEvent({
      auth: newUser.auth,
      body: {
        ...testEventInput,
        startDateTime: new Date("2000-01-01")
      }
    })
    expect(resp).toMatchObject({
      status: 400,
      data: { error: "invalid-request" }
    })
  })

  it("should still create an event if the placemark already exists", async () => {
    const newUser = await createUserFlow()
    addMockLocationToDB({
      latitude: 43.839319,
      longitude: 87.526148
    })
    const { eventIds } = await createEventFlow([
      {
        title: "test event",
        location: {
          type: "coordinate",
          value: {
            latitude: 43.839319,
            longitude: 87.526148
          }
        }
      }
    ])

    const resp = await testAPI.eventDetails({
      auth: newUser.auth,
      params: { eventId: eventIds[0] }
    })

    expect(resp).toMatchObject({
      status: 200,
      data: { id: expect.any(Number) }
    })
  })
})
