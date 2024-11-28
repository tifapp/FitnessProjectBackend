import { conn } from "TiFBackendUtils"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { dayjs } from "TiFShared/lib/Dayjs"
import { devEnv } from "../test/devIndex"
import { addMockLocationToDB } from "../test/location"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { createEventTransaction } from "./createEvent"

const testEventLocation = testEventInput.location.value as LocationCoordinate2D

describe("upcomingEvents tests", () => {
  beforeEach(() =>
    addMockLocationToDB(testEventLocation)
  )
  test("if no upcoming events, empty", async () => {
    const attendee = await createUserFlow()
    const resp = await testAPI.upcomingEvents<200>({
      auth: attendee.auth
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
      auth: attendee.auth
    })
    const eventIds = resp.data.events.map((e) => e.id)
    expect(eventIds).toEqual([earliestEventId, middleEventId, latestEventId])
  })
  test("if past event, removed from list", async () => {
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
      auth: user.auth
    })
    const eventIds = resp.data.events.map((e) => e.id)
    expect(eventIds).toEqual([upcomingEventId])
  })
})
