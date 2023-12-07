import { resetDB } from "../test/database.js"
import {
  callCreateEvent,
  callGetEventsByRegion,
  callJoinEvent
} from "../test/helpers/events.js"
import {
  callBlockUser,
  callPostFriendRequest,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"
import { addPlacemarkToDB } from "./sharedSQL.js"

let eventOwnerToken: string
let attendeeToken: string

describe("Join the event by id tests", () => {
  beforeAll(async () => {
    eventOwnerToken = await createUserAndUpdateAuth(global.defaultUser.auth)
    attendeeToken = await createUserAndUpdateAuth(global.defaultUser2.auth)
    await callPostFriendRequest(eventOwnerToken, global.defaultUser2.id)
    await callPostFriendRequest(attendeeToken, global.defaultUser.id)

    addPlacemarkToDB({
      lat: testEvents[0].latitude,
      lon: testEvents[0].longitude,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      street_num: "1234",
      unit_number: "5678"
    })

    const ongoingEventStartTime = new Date()
    const ongoingEventEndTime = new Date()
    const futureEventStartTime = new Date()
    const futureEventEndTime = new Date()
    futureEventStartTime.setFullYear(futureEventStartTime.getFullYear() + 1)
    futureEventEndTime.setFullYear(futureEventEndTime.getFullYear() + 2)

    const testFutureEvent = {
      ...testEvents[0],
      startTimestamp: futureEventStartTime,
      endTimestamp: futureEventEndTime
    }

    const testOngoingEvent = {
      ...testEvents[0],
      startTimestamp: ongoingEventStartTime,
      endTimestamp: ongoingEventEndTime
    }

    const ongoingEvent = await callCreateEvent(
      eventOwnerToken,
      testOngoingEvent
    )

    const futureEvent = await callCreateEvent(eventOwnerToken, testFutureEvent)

    await callJoinEvent(attendeeToken, parseInt(ongoingEvent.body.id))
    await callJoinEvent(eventOwnerToken, parseInt(ongoingEvent.body.id))

    await callJoinEvent(attendeeToken, parseInt(futureEvent.body.id))
    await callJoinEvent(eventOwnerToken, parseInt(futureEvent.body.id))
  })

  afterAll(async () => {
    resetDB()
  })

  it("should return 200 with the event, user relation, attendee count data", async () => {
    const respGetEventsByRegion = await callGetEventsByRegion(
      attendeeToken,
      testEvents[0].latitude,
      testEvents[0].longitude,
      50000
    )

    expect(respGetEventsByRegion.status).toEqual(200)
    expect(respGetEventsByRegion.body[0].relationHostToUser).toEqual("friends")
    expect(respGetEventsByRegion.body[0].relationUserToHost).toEqual("friends")
    expect(respGetEventsByRegion.body).toEqual("2")
  })

  // Test that the events are removed if either the host blocks the attendee.
  it("should return 200 with the events removed if the host blocks the attendee", async () => {
    await callBlockUser(eventOwnerToken, global.defaultUser2.id)

    const futureEventStartTime = new Date()
    const futureEventEndTime = new Date()

    futureEventStartTime.setFullYear(futureEventStartTime.getFullYear() + 1)
    futureEventEndTime.setFullYear(futureEventEndTime.getFullYear() + 2)

    const testFutureEvent = {
      ...testEvents[0],
      startTimestamp: futureEventStartTime,
      endTimestamp: futureEventEndTime
    }

    await callCreateEvent(eventOwnerToken, testFutureEvent)

    const respGetEventsByRegion = await callGetEventsByRegion(
      attendeeToken,
      testEvents[0].latitude,
      testEvents[0].longitude,
      50000
    )
    expect(respGetEventsByRegion.status).toEqual(200)
    expect(respGetEventsByRegion.body).toHaveLength(0)
  })

  // Test that the events are removed if either the attendee blocks the host.
  it("should return 200 with the events removed if the attendee blocks the host", async () => {
    const eventOwnerToken = await createUserAndUpdateAuth(
      global.defaultUser.auth
    )
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2.auth
    )

    await callBlockUser(attendeeToken, global.defaultUser.id)

    const futureEventStartTime = new Date()
    const futureEventEndTime = new Date()

    futureEventStartTime.setFullYear(futureEventStartTime.getFullYear() + 1)
    futureEventEndTime.setFullYear(futureEventEndTime.getFullYear() + 2)

    const testFutureEvent = {
      ...testEvents[0],
      startTimestamp: futureEventStartTime,
      endTimestamp: futureEventEndTime
    }

    await callCreateEvent(eventOwnerToken, testFutureEvent)

    const respGetEventsByRegion = await callGetEventsByRegion(
      attendeeToken,
      testEvents[0].latitude,
      testEvents[0].longitude,
      50000
    )
    expect(respGetEventsByRegion.status).toEqual(200)
    expect(respGetEventsByRegion.body).toHaveLength(0)
  })

  // Test that the total count for the event attendees is accurate.

  // Test that the event attendees array returned have three items and don't include the event host.

  // Happy Path -> return 200
})
