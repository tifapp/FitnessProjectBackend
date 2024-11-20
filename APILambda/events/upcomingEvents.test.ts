import dayjs from "dayjs"
import { conn } from "TiFBackendUtils"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { logger } from "TiFShared/logging"
import { addLocationToDB } from "../../GeocodingLambda/utils"
import { devTestEnv } from "../test/devIndex"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { createEventTransaction } from "./createEvent"

describe("_upcomingEvents tests", () => {
  beforeEach(async () => {
    await addLocationToDB(
      conn,
      {
        latitude: testEventInput.coordinates.latitude,
        longitude: testEventInput.coordinates.longitude,
        name: "Sample Location",
        city: "Sample Neighborhood",
        country: "Sample Country",
        street: "Sample Street",
        streetNumber: "1234"
      },
      "Sample/Timezone"
    )
  })
  const log = logger("upcoming.events.tests")
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
        dateRange: dateRange(
          dayjs().subtract(30, "minute").toDate(),
          dayjs().subtract(15, "minute").toDate()
        )
      },
      user.id,
      devTestEnv,
      log
    )
    const upcomingEventId = await createEventTransaction(
      conn,
      {
        ...testEventInput,
        dateRange: dateRange(
          dayjs().add(12, "hour").toDate(),
          dayjs().add(1, "year").toDate()
        )
      },
      user.id,
      devTestEnv,
      log
    ).unwrap()
    const resp = await testAPI.upcomingEvents<200>({
      auth: user.auth
    })
    const eventIds = resp.data.events.map((e) => e.id)
    expect(eventIds).toEqual([upcomingEventId])
  })
})
