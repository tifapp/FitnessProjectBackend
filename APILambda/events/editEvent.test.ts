import { conn } from "TiFBackendUtils"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { dayjs } from "TiFShared/lib/Dayjs"
import { devEnv } from "../test/devIndex"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { createEventTransaction } from "./createEvent"
import { dbEditedEventTimes } from "./editEvent"

describe("Edit event tests", () => {
  const eventLocation : EventEditLocation = { type: "coordinate", value: { latitude: 50, longitude: 50 } }

  it("should return 404 if the event doesn't exist", async () => {
    const newUser = await createUserFlow()

    const resp = await testAPI.editEvent({
      auth: newUser.auth,
      body: {
        title: "Test",
        description: "idk",
        startDateTime: dayjs().add(24, "hour").toDate(),
        duration: 3600,
        shouldHideAfterStartDate: true,
        location: eventLocation
      },
      params: { eventId: 0 }
    })

    console.log(resp.data)

    expect(resp).toMatchObject({
      status: 404,
      data: {
        error: "event-not-found"
      }
    })
  })

  it("should return 403 if a user besides the host tries to edit an event", async () => {
    const newUser = await createUserFlow()
    const {
      eventIds
    } = await createEventFlow([
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

    const resp = await testAPI.editEvent({
      auth: newUser.auth,
      body: {
        title: "Test",
        description: "idk",
        startDateTime: dayjs().add(24, "hour").toDate(),
        duration: 3600,
        shouldHideAfterStartDate: true,
        location: eventLocation
      },
      params: { eventId: eventIds[0] }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: {
        error: "user-not-host"
      }
    })
  })

  it("should return 403 if user edits an event that ended", async () => {
    const user = await createUserFlow()
    const { id: eventId } = (
      await createEventTransaction(
        conn,
        {
          ...testEventInput,
          startDateTime: dayjs().add(24, "hour").toDate(),
          duration: 3600
        },
        user.id,
        devEnv.geocode
      )
    ).unwrap()

    await testAPI.endEvent({ auth: user.auth, params: { eventId } })
    const resp = await testAPI.editEvent({
      auth: user.auth,
      params: { eventId },
      body: {
        title: "Test",
        description: "idk",
        startDateTime: dayjs().add(24, "hour").toDate(),
        duration: 3600,
        shouldHideAfterStartDate: true,
        location: eventLocation
      }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "event-has-ended" }
    })
  })

  it("should return edited event", async () => {
    const {
      eventIds,
      host
    } = await createEventFlow([
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

    const startDateTime = dayjs().add(24, "hour").toDate()

    const resp = await testAPI.editEvent({
      auth: host.auth,
      body: {
        title: "Test",
        description: "idk",
        startDateTime,
        duration: 3600,
        shouldHideAfterStartDate: true,
        location: eventLocation
      },
      params: { eventId: eventIds[0] }
    })

    expect(resp).toMatchObject({
      status: 200,
      data: {
        id: expect.any(Number),
        title: "Test",
        description: "idk",
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
          todayOrTomorrow: "tomorrow",
          dateRange: {
            startDateTime: startDateTime.toISOString(),
            endDateTime: dayjs(startDateTime)
              .add(1, "hour")
              .toDate()
              .toISOString()
          }
        }
      }
    })
  })

  describe("Event Time Edits", () => {
    it.each([
      [
        "original start and end date",
        {},
        { startDateTime: new Date("2001-01-01"), endDateTime: new Date("2001-01-02") }
      ],
      [
        "updated start and no duration",
        { startDateTime: new Date("2001-01-01") },
        { startDateTime: new Date("2000-01-01"), endDateTime: new Date("2000-01-02") }
      ],
      [
        "original start and updated duration",
        { duration: dayjs.duration(1, "day").asSeconds() },
        { startDateTime: new Date("2001-01-01"), endDateTime: new Date("2001-01-12") }
      ],
      [
        "updated start and end date",
        { startDateTime: new Date("2001-01-01"), duration: dayjs.duration(1, "day").asSeconds() },
        { startDateTime: new Date("2000-01-01"), endDateTime: new Date("2000-01-12") }
      ]
    ])("%s", (_, body, event) => {
      expect(dbEditedEventTimes(body, event)).toStrictEqual(
        { startDateTime: new Date("2001-01-01"), endDateTime: new Date("2001-01-02") }
      )
    })
  })
})
