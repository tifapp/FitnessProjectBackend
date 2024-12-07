import { conn } from "TiFBackendUtils"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { addLocationToDB } from "../../GeocodingLambda/utils"
import { testAPI } from "../test/testApp"
import { testEventInput, testEventInputCoordinate } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { createEventTransaction } from "./createEvent"
import { dayjs } from "TiFShared/lib/Dayjs"
import { randomUUID } from "crypto"
import { devEnv } from "../test/devIndex"

describe("_upcomingEvents tests", () => {
  beforeEach(async () => {
    await addLocationToDB(
      conn,
      {
        ...testEventInputCoordinate,
        name: "Sample Location",
        city: "Sample Neighborhood",
        country: "Sample Country",
        street: "Sample Street",
        streetNumber: "1234"
      },
      "Sample/Timezone"
    )
  })
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
})
