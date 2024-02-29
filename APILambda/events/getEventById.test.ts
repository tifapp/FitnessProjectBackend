import { TiFEvent, calcTodayOrTomorrow } from "TiFBackendUtils"
import { randomInt } from "crypto"
import dayjs from "dayjs"
import { expectTypeOf } from "expect-type"
import { callGetEvent } from "../test/apiCallers/events.js"
import { callBlockUser } from "../test/apiCallers/users.js"
import { testEventInput } from "../test/testEvents.js"
import { createEventFlow } from "../test/userFlows/events.js"
import { createUserFlow } from "../test/userFlows/users.js"
import { GetEventWhenBlockedResponse } from "./models.js"

// const today = new Date()
// today.setHours(23, 59, 59, 0)
// const tomorrow = new Date()
// tomorrow.setHours(0, 0, 0, 0)

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

    const {
      eventIds
    } = await createEventFlow([
      {
        ...eventLocation,
        startDateTime: dayjs().add(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      }
    ], 1)

    const resp = await callGetEvent(token, eventIds[0])
    console.log("Here is the response body ", resp.body)
    expectTypeOf(resp.body).toMatchTypeOf<TiFEvent>()
    expect(resp.status).toEqual(200)
  })
})

describe("Checks the data returned if the user blocks the host or vice versa is of the correct format", () => {
  const eventLocation = {
    latitude: testEventInput.latitude,
    longitude: testEventInput.longitude
  }

  it.only("should return host name and event title if blocked by host", async () => {
    const {
      attendeesList: [{ token: attendeeToken, userId: attendeeId }],
      host,
      eventIds
    } = await createEventFlow([
      {
        ...eventLocation,
        startDateTime: dayjs().add(12, "hour").toDate(),
        endDateTime: dayjs().add(1, "year").toDate()
      }
    ], 1)

    await callBlockUser(host.token, attendeeId)
    const resp = await callGetEvent(attendeeToken, eventIds[0])

    expect(resp.status).toEqual(403)
    expectTypeOf(resp.body).toMatchTypeOf<GetEventWhenBlockedResponse>()
  })

  it.only("should return host name and event title if attendee blocked host", async () => {
    const { attendeesList: [{ token: attendeeToken }], host, eventIds } =
      await createEventFlow([
        {
          ...eventLocation,
          startDateTime: dayjs().add(12, "hour").toDate(),
          endDateTime: dayjs().add(1, "year").toDate()
        }
      ], 1)

    await callBlockUser(attendeeToken, host.userId)
    const resp = await callGetEvent(attendeeToken, eventIds[0])

    expect(resp.status).toEqual(403)
    expectTypeOf(resp.body).toMatchTypeOf<GetEventWhenBlockedResponse>()
  })
})

describe("Check that the secondsToStart matches with TodayOrTomorrow", () => {
  it("should return 'Today' if the secondsToStart is less than SECONDS_IN_DAY", async () => {
    const today = dayjs()
    today.set("minute", 59)
    today.set("second", 59)

    const isToday = calcTodayOrTomorrow(today.toDate())
    expect(isToday).toEqual("Today")
  })

  it("should return 'Tomorrow' if the secondsToStart is greater than or equal to SECONDS_IN_DAY", async () => {
    const tomorrow = dayjs().add(1, "day")

    const isTomorrow = calcTodayOrTomorrow(tomorrow.toDate())
    expect(isTomorrow).toEqual("Tomorrow")
  })
})

describe("Check the user relations return the appropriate relation between the user and host", () => {
  it("should return 'curent-user' if the user views their own event for the themToYou and youToThem properties", async () => {
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
      body: {
        youToThem: "current-user",
        themToYou: "current-user"
      }
    })
  })
})
