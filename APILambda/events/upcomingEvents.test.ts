import { conn } from "TiFBackendUtils"
import {
  dateRange,
  FixedDateRange
} from "TiFShared/domain-models/FixedDateRange"
import { dayjs, now } from "TiFShared/lib/Dayjs"
import { devEnv } from "../test/devIndex"
import { testAPI } from "../test/testApp"
import { mockLocationCoordinate2D, testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { createEventTransaction } from "./createEvent"

import { randomUUID } from "crypto"
import { base64URLEncode } from "TiFShared/lib/Base64URLCoding"

describe("upcomingEvents tests", () => {
  test("if no upcoming events, empty", async () => {
    const attendee = await createUserFlow()
    const resp = await testAPI.upcomingEvents<200>({
      auth: attendee.auth,
      query: { userId: attendee.id }
    })
    expect(resp.data.events).toEqual([])
  })
  test("if upcoming events, list of events", async () => {
    const {
      attendeesList: [, attendee],
      eventIds: [middleEventId, earliestEventId, latestEventId]
    } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            dayjs().add(24, "hour").toDate(),
            dayjs().add(1, "year").toDate()
          )
        },
        {
          dateRange: dateRange(
            dayjs().add(12, "hour").toDate(),
            dayjs().add(1, "year").toDate()
          )
        },
        {
          dateRange: dateRange(
            dayjs().add(36, "hour").toDate(),
            dayjs().add(1, "year").toDate()
          )
        }
      ],
      1
    )
    const resp = await testAPI.upcomingEvents<200>({
      auth: attendee.auth,
      query: { userId: attendee.id }
    })
    const eventIds = resp.data.events.map((e) => e.id)
    expect(eventIds).toEqual([earliestEventId, middleEventId, latestEventId])
  })

  it("should load events that are within the maximum seconds to start parameter", async () => {
    const {
      attendeesList: [, attendee],
      eventIds: [earliestId, middleId]
    } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            dayjs().subtract(30, "minutes").toDate(),
            dayjs().add(1, "hours").toDate()
          )
        },
        {
          dateRange: dateRange(
            dayjs().add(1, "hours").toDate(),
            dayjs().add(2, "hours").toDate()
          )
        },
        {
          dateRange: dateRange(
            dayjs().add(3, "hours").toDate(),
            dayjs().add(4, "hours").toDate()
          )
        }
      ],
      1
    )
    const resp = await testAPI.upcomingEvents<200>({
      auth: attendee.auth,
      query: { userId: attendee.id, maxSecondsToStart: 7200 }
    })
    const eventIds = resp.data.events.map((e) => e.id)
    expect(eventIds).toEqual([earliestId, middleId])
  })

  it("should not load events that are within the maximum seconds to start parameter when the user is not an attendee", async () => {
    const nonAttendingUser = await createUserFlow()
    await createEventFlow(
      [
        {
          dateRange: dateRange(
            dayjs().subtract(30, "minutes").toDate(),
            dayjs().add(1, "hours").toDate()
          )
        }
      ],
      1
    )
    const resp = await testAPI.upcomingEvents<200>({
      auth: nonAttendingUser.auth,
      query: { userId: nonAttendingUser.id, maxSecondsToStart: 7200 }
    })
    const eventIds = resp.data.events.map((e) => e.id)
    expect(eventIds).toEqual([])
  })

  it("should remove past events from list", async () => {
    const user = await createUserFlow()
    await createEventTransaction(
      conn,
      {
        ...testEventInput,
        startDateTime: dayjs().subtract(30, "minute").toDate(),
        duration: dayjs.duration(15, "minutes").asSeconds()
      },
      user.id,
      devEnv.geocode
    )
    const { id: upcomingEventId } = (
      await createEventTransaction(
        conn,
        {
          ...testEventInput,
          startDateTime: dayjs().add(30, "minute").toDate(),
          duration: dayjs.duration(15, "minutes").asSeconds()
        },
        user.id,
        devEnv.geocode
      )
    ).unwrap()
    const resp = await testAPI.upcomingEvents<200>({
      auth: user.auth,
      query: { userId: user.id }
    })
    const eventIds = resp.data.events.map((e) => e.id)
    expect(eventIds).toEqual([upcomingEventId])
  })

  it("should not load events that the user is not participating in", async () => {
    const user = await createUserFlow()
    await createEventFlow(
      [
        {
          dateRange: dateRange(
            dayjs().add(24, "hour").toDate(),
            dayjs().add(1, "year").toDate()
          )
        },
        {
          dateRange: dateRange(
            dayjs().add(12, "hour").toDate(),
            dayjs().add(1, "year").toDate()
          )
        }
      ],
      1
    )
    const resp = await testAPI.upcomingEvents<200>({
      auth: user.auth,
      query: { userId: user.id }
    })
    expect(resp.data.events).toEqual([])
  })

  it("should load events in the specified date range", async () => {
    const current = now()
    const { host, eventIds } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            current.add(1, "hour").toDate(),
            current.add(2, "hour").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.add(30, "minutes").toDate(),
            current.add(1, "hour").add(45, "minutes").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.add(2, "hours").add(30, "minutes").toDate(),
            current.add(3, "hours").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.toDate(),
            current.add(4, "hours").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.toDate(),
            current.add(30, "minutes").toDate()
          )
        }
      ],
      1
    )
    const dateRangeParam = base64URLEncode(
      JSON.stringify({
        startDateTime: current.add(1, "hour").toDate(),
        endDateTime: current.add(2, "hour").toDate()
      })
    )
    // TODO: - Make the testAPI only accept query parameter input types.
    const resp = await testAPI.upcomingEvents<200>({
      auth: host.auth,
      query: {
        userId: host.id,
        dateRange: dateRangeParam as unknown as FixedDateRange
      }
    })
    expect(resp.data.events.map((e) => e.id)).toEqual([
      eventIds[3],
      eventIds[1],
      eventIds[0]
    ])
  })

  it("should include past events when using the dateRange query parameter", async () => {
    const current = now()
    const user = await createUserFlow()
    const event = await createEventTransaction(
      conn,
      {
        ...testEventInput,
        startDateTime: current.subtract(1, "day").subtract(2, "hours").toDate(),
        duration: dayjs.duration(90, "minutes").asSeconds()
      },
      user.id,
      devEnv.geocode
    ).unwrap()

    const dateRangeParam = base64URLEncode(
      JSON.stringify({
        startDateTime: current.subtract(1, "day").subtract(1, "hours").toDate(),
        endDateTime: current.subtract(1, "day").add(1, "hour").toDate()
      })
    )
    // TODO: - Make the testAPI only accept query parameter input types.
    const resp = await testAPI.upcomingEvents<200>({
      auth: user.auth,
      query: {
        userId: user.id,
        dateRange: dateRangeParam as unknown as FixedDateRange
      }
    })
    expect(resp.data.events.map((e) => e.id)).toEqual([event.id])
  })

  it("should load upcoming events for the user with the specified id if a user id is specified", async () => {
    const user1 = await createUserFlow()

    const {
      host,
      eventIds: [eventId]
    } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            dayjs().add(24, "hour").toDate(),
            dayjs().add(1, "year").toDate()
          )
        }
      ],
      0
    )

    await testAPI.sendFriendRequest({
      auth: user1.id,
      params: { userId: host.id }
    })
    const event = await testAPI.eventDetails<200>({
      auth: user1.auth,
      params: { eventId }
    })
    const resp = await testAPI.upcomingEvents<200>({
      auth: user1.auth,
      query: { userId: host.id }
    })
    expect(resp.data.events).toEqual([
      {
        ...event.data,
        time: { ...event.data.time, secondsToStart: expect.any(Number) }
      }
    ])
  })

  it("should not load events the user is not attending or hosting", async () => {
    const attendingUser = await createUserFlow()
    await createEventFlow(
      [
        {
          dateRange: dateRange(
            dayjs().add(24, "hour").toDate(),
            dayjs().add(25, "hour").toDate()
          )
        }
      ],
      10
    )
    const resp = await testAPI.upcomingEvents<200>({
      auth: attendingUser.auth,
      query: { userId: attendingUser.id }
    })
    expect(resp.data.events).toEqual([])
  })

  it("should not load events the user is not attending or hosting when they are at least in one event", async () => {
    const nonAttendingUser = await createUserFlow()
    const {
      eventIds: [eventId]
    } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            dayjs().add(24, "hour").toDate(),
            dayjs().add(25, "hour").toDate()
          )
        }
      ],
      10
    )
    await testAPI.joinEvent<200>({
      auth: nonAttendingUser.auth,
      params: { eventId }
    })

    const resp = await testAPI.upcomingEvents<200>({
      auth: nonAttendingUser.auth,
      query: { userId: nonAttendingUser.id }
    })
    expect(resp.data.events.map((e) => e.id)).toEqual([eventId])
  })

  it("should not load other users' events", async () => {
    const attendingUser = await createUserFlow()
    const otherUser = await createUserFlow()
    const attendingEventTitle = "Whatever"
    const otherUserTitle = "Event"

    await testAPI.createEvent<201>({
      auth: otherUser.auth,
      body: {
        ...testEventInput,
        title: otherUserTitle,
        duration: 159
      }
    })
    await testAPI.createEvent<201>({
      auth: attendingUser.auth,
      body: {
        ...testEventInput,
        title: attendingEventTitle,
        duration: 132
      }
    })
    const resp = await testAPI.upcomingEvents<200>({
      auth: attendingUser.auth,
      query: { userId: attendingUser.id }
    })
    expect(resp.data.events.map((e) => e.title)).toEqual([attendingEventTitle])
  })

  it("should return user not found when user does not exists", async () => {
    const user = await createUserFlow()
    const resp = await testAPI.upcomingEvents<404>({
      auth: user.auth,
      query: { userId: randomUUID() }
    })
    expect(resp.status).toEqual(404)
  })

  it("should return blocked when user is blocked by other user", async () => {
    const user = await createUserFlow()
    const user2 = await createUserFlow()
    await testAPI.blockUser({ auth: user2.auth, params: { userId: user.id } })
    const resp = await testAPI.upcomingEvents<403>({
      auth: user.auth,
      query: { userId: user2.id }
    })
    expect(resp.status).toEqual(403)
  })

  it("user joins this event and arrives at a different event, the user shows up in both events", async () => {
    const attendee = await createUserFlow()
    const startDateTime = dayjs(new Date())
      .millisecond(0)
      .toDate()
      .ext.addSeconds(10)

    const soccerLocation = mockLocationCoordinate2D()
    const basketballLocation = mockLocationCoordinate2D()

    const {
      host: soccerHost,
      eventResponses: [soccerEvent]
    } = await createEventFlow([
      {
        title: "Soccer Game",
        startDateTime,
        duration: 3600,
        location: { type: "coordinate", value: soccerLocation }
      }
    ])

    const {
      host: basketballHost,
      eventResponses: [basketballEvent]
    } = await createEventFlow([
      {
        title: "Basketball Game",
        startDateTime,
        duration: 3600,
        location: { type: "coordinate", value: basketballLocation }
      }
    ])

    await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId: soccerEvent.data.id }
    })

    await testAPI.joinEvent({
      auth: attendee.auth,
      params: { eventId: basketballEvent.data.id }
    })

    await testAPI.updateArrivalStatus({
      auth: attendee.auth,
      body: {
        status: "arrived",
        coordinate: soccerLocation,
        arrivalRadiusMeters: 100
      }
    })

    const attendeeUpcomingEvents = await testAPI.upcomingEvents<200>({
      auth: attendee.auth,
      query: { userId: attendee.id }
    })

    expect(attendeeUpcomingEvents).toMatchObject({
      status: 200,
      data: {
        events: [
          {
            id: soccerEvent.data.id,
            previewAttendees: [
              expect.objectContaining({ id: soccerHost.id, role: "hosting" }),
              expect.objectContaining({ id: attendee.id, role: "attending" })
            ]
          },
          {
            id: basketballEvent.data.id,
            previewAttendees: [
              expect.objectContaining({
                id: basketballHost.id,
                role: "hosting"
              }),
              expect.objectContaining({ id: attendee.id, role: "attending" })
            ]
          }
        ]
      }
    })
  })
})
