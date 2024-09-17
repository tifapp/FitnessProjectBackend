import { conn } from "TiFBackendUtils"
import { TiFEvent } from "TiFBackendUtils/TifEventUtils"
import { randomInt } from "crypto"
import { expectTypeOf } from "expect-type"
import { addLocationToDB, getTimeZone } from "../../GeocodingLambda/utils"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("getEvent", () => {
  it("should return 404 if the event doesnt exist", async () => {
    const newUser = await createUserFlow()
    const eventId = randomInt(1000)
    const resp = await testAPI.eventDetails({ auth: newUser.auth, params: { eventId } })

    expect(resp).toMatchObject({
      status: 404,
      data: { error: "event-not-found" }
    })
  })

  it("should return event details if the event exists", async () => {
    const newUser = await createUserFlow()

    const eventTimeZone = getTimeZone({ latitude: testEventInput.coordinates.latitude, longitude: testEventInput.coordinates.longitude })

    addLocationToDB(
      conn,
      {
        latitude: testEventInput.coordinates.latitude,
        longitude: testEventInput.coordinates.longitude,
        name: "Sample Location",
        city: "Sample Neighborhood",
        country: "Sample Country",
        isoCountryCode: "USA",
        street: "Sample Street",
        streetNumber: "1234"
      },
      eventTimeZone[0]
    )

    const {
      eventIds,
      host,
      attendeesList
    } = await createEventFlow([
      {
        title: "Fake Event",
        description: "This is some random event"
      }
    ], 1)

    const resp = await testAPI.eventDetails({ auth: newUser.auth, params: { eventId: eventIds[0] } })

    // how did we test today/tomorrow? check again the original test, and maybe write separate tests to check the today/tomorrow fields from tifevent
    expectTypeOf(resp.data).toMatchTypeOf<TiFEvent>()
    expect(resp.data).toEqual(
      {
        id: eventIds[0],
        title: "Fake Event",
        color: "#72B01D",
        isChatExpired: false,
        description: "This is some random event",
        attendeeCount: 2,
        time: {
          secondsToStart: expect.any(Number),
          dateRange: {
            startDateTime: testEventInput.dateRange.startDateTime.toISOString(),
            endDateTime: testEventInput.dateRange.endDateTime.toISOString()
          },
          todayOrTomorrow: "today"
        },
        previewAttendees: attendeesList.map(({ id }) => ({ id })),
        location: {
          coordinate: testEventInput.coordinates,
          placemark: {
            name: "Sample Location",
            city: "Sample Neighborhood",
            country: "Sample Country",
            street: "Sample Street",
            isoCountryCode: "USA",
            streetNumber: "1234"
          },
          timezoneIdentifier: eventTimeZone[0],
          arrivalRadiusMeters: 120,
          isInArrivalTrackingPeriod: true
        },
        host: {
          relations: {
            fromThemToYou: "not-friends",
            fromYouToThem: "not-friends"
          },
          id: host.id,
          name: host.name,
          handle: host.handle
        },
        settings: {
          shouldHideAfterStartDate: true,
          isChatEnabled: true
        },
        updatedDateTime: expect.any(String),
        createdDateTime: expect.any(String),
        userAttendeeStatus: "not-participating",
        hasArrived: false
      })
    expect(resp.status).toEqual(200)
  })

  describe("Checks the data returned if the user blocks the host or vice versa is of the correct format", () => {
    it("should return host name and event title if blocked by host", async () => {
      const { attendeesList: [, attendee], host, eventIds: [eventId] } = await createEventFlow([{}], 1)

      await testAPI.blockUser(userToUserRequest(host, attendee))
      const resp = await testAPI.eventDetails({ auth: attendee.auth, params: { eventId } })

      expect(resp.status).toEqual(403)
      expect(resp.data).toMatchObject({
        error: "user-is-blocked" // unauthorized???
      })
    })

    it("should return host name and event title if attendee blocked host", async () => {
      const { attendeesList: [, attendee], host, eventIds: [eventId] } = await createEventFlow([{}], 1)

      await testAPI.blockUser(userToUserRequest(attendee, host))
      const resp = await testAPI.eventDetails({ auth: attendee.auth, params: { eventId } })

      expect(resp.status).toEqual(403)
      expect(resp.data).toMatchObject({
        error: "user-is-blocked"
      })
    })
  })

  describe("Check the user relations return the appropriate relation between the user and host", () => {
    it("should return 'current-user' if the user views their own event for the fromThemToYou and fromYouToThem properties", async () => {
      const {
        host,
        eventIds
      } = await createEventFlow([{}], 1)

      const resp = await testAPI.eventDetails({ auth: host.auth, params: { eventId: eventIds[0] } })

      expect(resp).toMatchObject({
        status: 200,
        data: expect.objectContaining({
          host: expect.objectContaining({
            relations: expect.objectContaining({
              fromYouToThem: "current-user",
              fromThemToYou: "current-user"
            })
          })
        })
      })
    })
  })
})
