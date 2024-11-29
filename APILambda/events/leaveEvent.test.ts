import dayjs from "dayjs"
import { conn } from "TiFBackendUtils"
import { devEnv } from "../test/devIndex"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { createEventTransaction } from "./createEvent"

describe("Leave event tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return 204 if user leaves the event", async () => {
    const {
      attendeesList: [, attendee],
      eventIds: [eventId]
    } = await createEventFlow(
      [
        {
          location: {
            type: "coordinate",
            value: eventLocation
          }
        }
      ],
      1
    )

    const resp = await testAPI.leaveEvent({
      auth: attendee.auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 204
    })
  })

  it("should assign the host to be the earliest joining attendee when the host leaves", async () => {
    const {
      host,
      attendeesList,
      eventIds: [eventId]
    } = await createEventFlow(
      [
        {
          location: {
            type: "coordinate",
            value: eventLocation
          }
        }
      ],
      2
    )

    const resp = await testAPI.leaveEvent({
      auth: host.auth,
      params: { eventId }
    })
    expect(resp).toMatchObject({ status: 204 })

    const event = await testAPI.eventDetails<200>({
      auth: host.auth,
      params: { eventId }
    })
    expect(event.data.host.id).toEqual(attendeesList[1].id)
    expect(event.data.previewAttendees[0].id).toEqual(attendeesList[1].id)
    expect(event.data.previewAttendees[0].role).toEqual("hosting")
  })

  it("should delete the event when everyone leaves", async () => {
    const {
      host,
      eventIds: [eventId],
      attendeesList
    } = await createEventFlow([{ coordinates: eventLocation }], 1)

    console.log("Original host id", host.id)

    await testAPI.leaveEvent({
      auth: host.auth,
      params: { eventId }
    })
    await testAPI.leaveEvent({
      auth: attendeesList[1].auth,
      params: { eventId }
    })

    const event = await testAPI.eventDetails({
      auth: host.auth,
      params: { eventId }
    })
    expect(event.status).toEqual(404)
  })

  it("should not delete the event when 2 users and 1 user leaves twice", async () => {
    const {
      host,
      eventIds: [eventId]
    } = await createEventFlow([{ coordinates: eventLocation }], 1)

    await testAPI.leaveEvent({
      auth: host.auth,
      params: { eventId }
    })
    await testAPI.leaveEvent({
      auth: host.auth,
      params: { eventId }
    })

    const event = await testAPI.eventDetails({
      auth: host.auth,
      params: { eventId }
    })
    expect(event.status).toEqual(200)
  })

  it("should return 200 if user leaves event twice", async () => {
    const {
      attendeesList,
      eventIds: [eventId]
    } = await createEventFlow(
      [
        {
          location: {
            type: "coordinate",
            value: eventLocation
          }
        }
      ],
      1
    )

    await testAPI.leaveEvent({
      auth: attendeesList[1].auth,
      params: { eventId }
    })
    const resp = await testAPI.leaveEvent({
      auth: attendeesList[1].auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 200
    })
  })

  it("should return 404 if user leaves an event that doesn't exist", async () => {
    const attendee = await createUserFlow()
    const nonExistantEventId = 9999
    const resp = await testAPI.leaveEvent({
      auth: attendee.auth,
      params: { eventId: nonExistantEventId }
    })

    expect(resp).toMatchObject({
      status: 404,
      data: { error: "event-not-found" }
    })
  })

  it("should return 403 if user leaves an event that ended before it starts", async () => {
    const {
      eventIds: [eventId],
      host,
      attendeesList: [, attendee]
    } = await createEventFlow(
      [
        {
          startDateTime: new Date().ext.addSeconds(1000),
          duration: 1000,
          location: {
            type: "coordinate",
            value: eventLocation
          }
        }
      ],
      1
    )

    await testAPI.endEvent({ auth: host.auth, params: { eventId } })
    const resp = await testAPI.leaveEvent({
      auth: attendee.auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "event-was-cancelled" }
    })
  })

  it("should return 403 if user leaves an event that ended", async () => {
    const user = await createUserFlow()
    const { id: eventId } = (
      await createEventTransaction(
        conn,
        {
          ...testEventInput,
          startDateTime: dayjs().subtract(1, "year").toDate(),
          duration: 3600
        },
        user.id,
        devEnv.geocode
      )
    ).unwrap()

    await testAPI.endEvent({ auth: user.auth, params: { eventId } })
    const resp = await testAPI.leaveEvent({
      auth: user.auth,
      params: { eventId }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "event-has-ended" }
    })
  })

  // TODO: Test eventAttendance endpoint to check that the user is no longer on the eventAttendance list
})
