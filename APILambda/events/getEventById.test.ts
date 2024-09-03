import { conn } from "TiFBackendUtils"
import { TiFEvent, calcSecondsToStart, calcTodayOrTomorrow } from "TiFBackendUtils/TifEventUtils"
import { randomInt } from "crypto"
import dayjs from "dayjs"
import { expectTypeOf } from "expect-type"
import { addLocationToDB, getTimeZone } from "../../GeocodingLambda/utils"
import { callGetEvent } from "../test/apiCallers/eventEndpoints"
import { callBlockUser } from "../test/apiCallers/userEndpoints"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { BlockedTiFEventResponse } from "./getEventById"

describe("GetSingleEvent tests", () => {
  const eventLocation = {
    latitude: testEventInput.latitude,
    longitude: testEventInput.longitude
  }

  it("should return 404 if the event doesnt exist", async () => {
    const { token } = await createUserFlow()
    const eventId = randomInt(1000)
    const resp = await callGetEvent(token, eventId)

    expect(resp).toMatchObject({
      status: 404,
      body: { error: "event-not-found" }
    })
  })

  it("should return event details if the event exists", async () => {
    const { token } = await createUserFlow()
    const today = dayjs()
    today.set("minute", 59)
    today.set("second", 59)

    const eventTimeZone = getTimeZone({ latitude: testEventInput.latitude, longitude: testEventInput.longitude })

    addLocationToDB(
      conn,
      {
        latitude: testEventInput.latitude,
        longitude: testEventInput.longitude,
        name: "Sample Location",
        city: "Sample Neighborhood",
        country: "Sample Country",
        isoCountryCode: "USA",
        street: "Sample Street",
        streetNumber: "1234"
      },
      eventTimeZone[0]
    )

    const expectedStartDateTime = dayjs().startOf("hour").toDate()
    const expectedEndDateTime = dayjs().add(1, "hour").startOf("hour").toDate()

    const {
      eventIds,
      host,
      attendeesList
    } = await createEventFlow([
      {
        ...eventLocation,
        title: "Fake Event",
        description: "This is some random event",
        startDateTime: expectedStartDateTime,
        endDateTime: expectedEndDateTime
      }
    ], 1)

    const resp = await callGetEvent(token, eventIds[0])

    expectTypeOf(resp.body).toMatchTypeOf<TiFEvent>()
    expect(resp.body).toEqual(
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
            startDateTime: expectedStartDateTime.toISOString(),
            endDateTime: expectedEndDateTime.toISOString()
          },
          todayOrTomorrow: "today"
        },
        previewAttendees: attendeesList.map(({ userId }) => ({ id: userId, profileImageURL: null })),
        location: {
          coordinate: {
            latitude: testEventInput.latitude,
            longitude: testEventInput.longitude
          },
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
          id: host.userId,
          username: host.name,
          handle: host.handle,
        },
        settings: {
          shouldHideAfterStartDate: true,
          isChatEnabled: true
        },
        updatedDateTime: expect.any(String),
        createdDateTime: expect.any(String),
        userAttendeeStatus: "not-participating",
        hasArrived: false,
      })
    expect(resp.status).toEqual(200)
  })
})

describe("Checks the data returned if the user blocks the host or vice versa is of the correct format", () => {
  const eventLocation = {
    latitude: testEventInput.latitude,
    longitude: testEventInput.longitude
  }

  it("should return host name and event title if blocked by host", async () => {
    const {
      attendeesList,
      host,
      eventIds
    } = await createEventFlow([
      {
        ...eventLocation,
        startDateTime: dayjs().add(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      }
    ], 1)

    await callBlockUser(host.token, attendeesList[1].userId)
    const resp = await callGetEvent(attendeesList[1].token, eventIds[0])

    expect(resp.status).toEqual(403)
    expectTypeOf(resp.body).toMatchTypeOf<BlockedTiFEventResponse>()
  })

  it("should return host name and event title if attendee blocked host", async () => {
    const { attendeesList, host, eventIds } =
      await createEventFlow([
        {
          ...eventLocation,
          startDateTime: dayjs().add(12, "hour").toDate(),
          endDateTime: dayjs().add(1, "year").toDate()
        }
      ], 1)

    await callBlockUser(attendeesList[1].token, host.userId)
    const resp = await callGetEvent(attendeesList[1].token, eventIds[0])

    expect(resp.status).toEqual(403)
    expectTypeOf(resp.body).toMatchTypeOf<BlockedTiFEventResponse>()
  })
})

describe("Check that the secondsToStart matches with TodayOrTomorrow", () => {
  it("should return 'Today' if the secondsToStart is less than SECONDS_IN_DAY", async () => {
    const today = dayjs()
    today.set("minute", 59)
    today.set("second", 59)
    const isToday = calcTodayOrTomorrow(today.toDate())
    expect(isToday).toEqual("today")
  })

  it("should return 'Tomorrow' if the secondsToStart is greater than or equal to SECONDS_IN_DAY", async () => {
    const tomorrow = dayjs().add(1, "day")

    const isTomorrow = calcTodayOrTomorrow(tomorrow.toDate())
    expect(isTomorrow).toEqual("tomorrow")
  })
})

describe("Check that the secondsToStart is accurate", () => {
  it("should return the positive seconds before an event starts", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("December 17, 1995 03:24:00"))
    const secondsToStart = calcSecondsToStart(new Date("December 17, 1995 03:25:00"))
    expect(secondsToStart).toEqual(60)
    jest.useRealTimers()
  })

  it("should return the negative seconds after an event starts", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("December 17, 1995 03:25:00"))
    const secondsToStart = calcSecondsToStart(new Date("December 17, 1995 03:24:00"))
    expect(secondsToStart).toEqual(-60)
    jest.useRealTimers()
  })
})

describe("Check the user relations return the appropriate relation between the user and host", () => {
  it("should return 'current-user' if the user views their own event for the fromThemToYou and fromYouToThem properties", async () => {
    const eventLocation = {
      latitude: testEventInput.latitude,
      longitude: testEventInput.longitude
    }
    const {
      host,
      eventIds
    } = await createEventFlow([
      {
        ...eventLocation,
        startDateTime: dayjs().add(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      }
    ], 1)

    const resp = await callGetEvent(host.token, eventIds[0])

    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
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
