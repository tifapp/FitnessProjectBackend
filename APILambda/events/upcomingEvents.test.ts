import dayjs from "dayjs"
import { conn } from "TiFBackendUtils"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { addLocationToDB } from "../../GeocodingLambda/utils"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"

describe("upcomingEvents tests", () => {
  test("if no upcoming events, empty", async () => {
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

    const attendee = await createUserFlow()
    const resp = await testAPI.upcomingEvents<200>({
      auth: attendee.auth
    })

    expect(resp.status).toEqual(200)
    expect(resp.data.events).toEqual([])
  })
  test("if upcoming events, list of events", async () => {
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

    const {
      attendeesList: [, attendee],
      eventIds: [furtherEventId, upcomingEventId, furthestEventId]
    } = await createEventFlow([
      {
        dateRange: dateRange(dayjs().add(24, "hour").toDate(), dayjs().add(1, "year").toDate())
      },
      {
        dateRange: dateRange(dayjs().add(12, "hour").toDate(), dayjs().add(1, "year").toDate())
      },
      {
        dateRange: dateRange(dayjs().add(36, "hour").toDate(), dayjs().add(1, "year").toDate())
      }
    ], 1)

    const resp = await testAPI.upcomingEvents<200>({
      auth: attendee.auth
    })

    expect(resp.status).toEqual(200)
    expect(resp.data.events).toEqual([upcomingEventId, furtherEventId, furthestEventId])
  })
  test("if past event, removed from list", async () => {
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

    const {
      attendeesList: [, attendee],
      // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      eventIds: [pastEventId, upcomingEventId]
    } = await createEventFlow([
      {
        dateRange: dateRange(dayjs().subtract(24, "hour").toDate(), dayjs().subtract(23, "hour").toDate())
      },
      {
        dateRange: dateRange(dayjs().add(12, "hour").toDate(), dayjs().add(1, "year").toDate())
      }
    ], 1)

    const resp = await testAPI.upcomingEvents<200>({
      auth: attendee.auth
    })

    expect(resp.status).toEqual(200)
    expect(resp.data.events).toEqual([upcomingEventId])
  })
})
