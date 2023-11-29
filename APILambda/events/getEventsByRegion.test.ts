import { resetDatabaseBeforeEach } from "../test/database.js"
import {
  callCreateEvent,
  callGetEventsByRegion,
  callJoinEvent
} from "../test/helpers/events.js"
import {
  callPostFriendRequest,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"
import { addPlacemarkToDB } from "./sharedSQL.js"

describe("Join the event by id tests", () => {
  resetDatabaseBeforeEach()

  // Checks that the events that have ended are removed and those that haven't are returned
  it("should return 200 with the events that haven't started and filtered out the started events", async () => {
    const eventOwnerToken = await createUserAndUpdateAuth(
      global.defaultUser.auth
    )
    const attendeeToken = await createUserAndUpdateAuth(
      global.defaultUser2.auth
    )

    callPostFriendRequest(eventOwnerToken, global.defaultUser2.id)
    await callPostFriendRequest(attendeeToken, global.defaultUser.id)

    const ongoingEventStartTime = new Date()

    jest.useFakeTimers()
    jest.setSystemTime(new Date("2050-01-01"))

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

    const ongoingEvent = await callCreateEvent(
      eventOwnerToken,
      testOngoingEvent
    )

    const futureEvent = await callCreateEvent(eventOwnerToken, testFutureEvent)

    await callJoinEvent(attendeeToken, parseInt(ongoingEvent.body.id))
    await callJoinEvent(eventOwnerToken, parseInt(ongoingEvent.body.id))

    await callJoinEvent(attendeeToken, parseInt(futureEvent.body.id))
    await callJoinEvent(eventOwnerToken, parseInt(futureEvent.body.id))

    const respGetEventsByRegion = await callGetEventsByRegion(
      attendeeToken,
      testEvents[0].latitude,
      testEvents[0].longitude,
      50000
    )
    expect(respGetEventsByRegion.status).toEqual(200)
    expect(respGetEventsByRegion.body[0].id).toEqual(futureEvent.body.id)
    expect(respGetEventsByRegion.body).toHaveLength(1)
    jest.useRealTimers()
  })

  // Test that the events are removed if either the host blocks the attendee or vice versa. If not, check the relation.

  // Test that the place-mark info is accurate if it exists. Otherwise, if it doesn't then verify the value for the field is null

  // Test that the total count for the event attendees is accurate.

  // Test that the event attendees array returned have three items and don't include the event host.

  // Happy Path -> return 200
})
