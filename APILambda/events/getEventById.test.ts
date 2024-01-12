import { randomInt } from "crypto"
import { callCreateEvent, callGetEvent } from "../test/apiCallers/events.js"
import { createUserFlow } from "../test/userFlows/users.js"
import { testEvent } from "../test/testEvents.js"
import { callBlockUser } from "../test/apiCallers/users.js"
import { createEventFlow } from "../test/userFlows/events.js"
import dayjs from "dayjs"

describe("GetSingleEvent tests", () => {
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
    const startTimestamp = new Date("2050-01-01")
    const endTimestamp = new Date("2050-01-02")
    const createEventResponse = await callCreateEvent(token, {
      ...testEvent,
      startTimestamp,
      endTimestamp
    })
    const resp = await callGetEvent(token, createEventResponse.body.id)

    expect(resp).toMatchObject({
      status: 200,
      body: {
        title: testEvent.title,
        description: testEvent.description,
        startTimestamp: startTimestamp.toISOString(),
        endTimestamp: endTimestamp.toISOString(),
        latitude: testEvent.latitude,
        longitude: testEvent.longitude
      }
    })
  })
})

describe("Get event's host and title only", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return host name and event title if blocked by host", async () => {
    const {
      attendeeToken,
      attendeeId,
      hostToken,
      hostHandle,
      hostName,
      eventIds
    } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    await callBlockUser(hostToken, attendeeId)
    const resp = await callGetEvent(attendeeToken, eventIds[0])

    expect(resp).toMatchObject({
      status: 403,
      body: expect.objectContaining({
        handle: hostHandle,
        name: hostName,
        profileImageURL: null,
        title: testEvent.title
      })
    })
  })

  it("should return host name and event title if attendee blocked host", async () => {
    const { attendeeToken, hostId, hostHandle, hostName, eventIds } =
      await createEventFlow([
        {
          ...eventLocation,
          startTimestamp: dayjs().add(12, "hour").toDate(),
          endTimestamp: dayjs().add(1, "year").toDate()
        }
      ])

    await callBlockUser(attendeeToken, hostId)
    const resp = await callGetEvent(attendeeToken, eventIds[0])

    expect(resp).toMatchObject({
      status: 403,
      body: expect.objectContaining({
        handle: hostHandle,
        name: hostName,
        profileImageURL: null,
        title: testEvent.title
      })
    })
  })
})
