import { conn } from "TiFBackendUtils"
import { randomInt } from "crypto"
import { addLocationToDB, getTimeZone } from "../../GeocodingLambda/utils"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow, userDetails } from "../test/userFlows/createUserFlow"

describe("getEventDetails", () => {
  it("should return 404 if the event doesnt exist", async () => {
    const newUser = await createUserFlow()
    const eventId = randomInt(1000)
    const resp = await testAPI.eventDetails({
      auth: newUser.auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 404,
      data: { error: "event-not-found" }
    })
  })

  it("should return event details if the event exists", async () => {
    const newUser = await createUserFlow()

    const eventTimeZone = getTimeZone({
      latitude: testEventInput.location.value.latitude,
      longitude: testEventInput.location.value.longitude
    })

    addLocationToDB(
      conn,
      {
        latitude: testEventInput.location.value.latitude,
        longitude: testEventInput.location.value.longitude,
        name: "Sample Location",
        city: "Sample Neighborhood",
        country: "Sample Country",
        isoCountryCode: "USA",
        street: "Sample Street",
        streetNumber: "1234"
      },
      eventTimeZone[0]
    )

    const { eventIds, host, attendeesList } = await createEventFlow(
      [
        {
          title: "Fake Event",
          description: "This is some random event"
        }
      ],
      5
    )

    const resp = await testAPI.eventDetails({
      auth: newUser.auth,
      params: { eventId: eventIds[0] }
    })

    expect(resp).toEqual({
      status: 200,
      data: {
        id: eventIds[0],
        title: "Fake Event",
        isChatExpired: false,
        description: "This is some random event",
        attendeeCount: 6,
        time: {
          secondsToStart: expect.any(Number),
          dateRange: {
            startDateTime:
              testEventInput.dateRange!.startDateTime.toISOString(),
            endDateTime: testEventInput.dateRange!.endDateTime.toISOString()
          },
          todayOrTomorrow: "today"
        },
        previewAttendees: attendeesList.map((user, index) => ({
          ...userDetails(user),
          role: index === 0 ? "hosting" : "attending",
          relationStatus: "not-friends",
          joinedDateTime: expect.any(String),
          hasArrived: false
        })),
        location: {
          coordinate: testEventInput.location.value,
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
          relationStatus: "not-friends",
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
      }
    })
  })

  it("should return limited event details if blocked by host", async () => {
    const {
      attendeesList: [, attendee],
      host,
      eventIds: [eventId]
    } = await createEventFlow([{}], 1)

    await testAPI.blockUser(userToUserRequest(host, attendee))
    const resp = await testAPI.eventDetails({
      auth: attendee.auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: {
        error: "blocked-you"
      }
    })
  })

  describe("Check the user relations return the appropriate relation between the user and host", () => {
    it("should return 'current-user' if the user views their own event for the fromThemToYou and fromYouToThem properties", async () => {
      const { host, eventIds } = await createEventFlow([{}], 1)

      const resp = await testAPI.eventDetails({
        auth: host.auth,
        params: { eventId: eventIds[0] }
      })

      expect(resp).toMatchObject({
        status: 200,
        data: expect.objectContaining({
          host: expect.objectContaining({
            relationStatus: "current-user"
          })
        })
      })
    })
  })
})
