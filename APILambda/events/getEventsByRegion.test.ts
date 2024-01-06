import { conn } from "TiFBackendUtils"
import { resetDatabaseBeforeEach } from "../test/database.js"
import { callCreateEvent, callJoinEvent } from "../test/helpers/events.js"
import {
  callBlockUser,
  callPostFriendRequest,
  createUserAndUpdateAuth
} from "../test/helpers/users.js"
import { testEvents } from "../test/testEvents.js"
import { getEventsByRegion } from "./getEventsByRegion.js"
import { addPlacemarkToDB } from "./sharedSQL.js"

let eventOwnerToken: string
let attendeeToken: string

const setupDB = async () => {
  eventOwnerToken = await createUserAndUpdateAuth(global.defaultUser)
  attendeeToken = await createUserAndUpdateAuth(global.defaultUser2)
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

  const ongoingEvent = await callCreateEvent(eventOwnerToken, testOngoingEvent)

  const futureEvent = await callCreateEvent(eventOwnerToken, testFutureEvent)

  await callJoinEvent(attendeeToken, parseInt(ongoingEvent.body.id))
  await callJoinEvent(eventOwnerToken, parseInt(ongoingEvent.body.id))

  await callJoinEvent(attendeeToken, parseInt(futureEvent.body.id))
  await callJoinEvent(eventOwnerToken, parseInt(futureEvent.body.id))
}

// describe("Testing the getEventsByRegion endpoint", () => {
//   resetDatabaseBeforeEach()
//   beforeEach(setupDB)

//   it("should return 200 with the event, user relation, attendee count data", async () => {
//     const respGetEventsByRegion = await callGetEventsByRegion(
//       attendeeToken,
//       testEvents[0].latitude,
//       testEvents[0].longitude,
//       50000
//     )

//     expect(respGetEventsByRegion.status).toEqual(200)
//     // expect(respGetEventsByRegion.body[0].relationHostToUser).toEqual("friends")
//     // expect(respGetEventsByRegion.body[0].relationUserToHost).toEqual("friends")
//     expect(respGetEventsByRegion.body[0].attendees.count).toEqual(1)
//   })
// })

describe("Testing the individual queries from the getEventsByRegion endpoint", () => {
  resetDatabaseBeforeEach()
  beforeEach(setupDB)

  it("should not return events that are not within the radius", async () => {
    const events = await getEventsByRegion(conn, {
      userId: global.defaultUser2.id,
      userLatitude: testEvents[0].latitude + 10,
      userLongitude: testEvents[0].longitude + 10,
      radius: 1
    })
    expect(events.value).toHaveLength(0)
  })

  it("should remove the events where the host blocks the attendee", async () => {
    await callBlockUser(eventOwnerToken, global.defaultUser2.id)

    const events = await getEventsByRegion(conn, {
      userId: global.defaultUser2.id,
      userLatitude: testEvents[0].latitude,
      userLongitude: testEvents[0].longitude,
      radius: 50000
    })
    expect(events.value).toHaveLength(0)
  })

  // it("should remove the events where the attendee blocks the host", async () => {
  //   await callBlockUser(attendeeToken, global.defaultUser.id)

  //   const events = await getEventsByRegion(conn, {
  //     userId: global.defaultUser2.id,
  //     userLatitude: testEvents[0].latitude,
  //     userLongitude: testEvents[0].longitude,
  //     radius: 50000
  //   })
  //   expect(events.value).toHaveLength(0)
  // })

  // it("should return the attendee list not including the event host", async () => {
  //   const events = await getEventsByRegion(conn, {
  //     userId: global.defaultUser2.id,
  //     userLatitude: testEvents[0].latitude,
  //     userLongitude: testEvents[0].longitude,
  //     radius: 50000
  //   })
  //   const attendees = await getAttendees(`${events.value[0].id}`)
  //   expect(attendees.value).toHaveLength(1)
  //   expect(attendees.value[0].userIds).not.toEqual(events.value[0].hostId)
  // })
})
