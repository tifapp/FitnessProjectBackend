import { conn } from "TiFBackendUtils"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { dayjs } from "TiFShared/lib/Dayjs"
import { sleep } from "TiFShared/lib/DelayData"
import { devEnv } from "../test/devIndex"
import { addMockLocationToDB } from "../test/location"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow, userDetails } from "../test/userFlows/createUserFlow"
import { createEventTransaction } from "./createEvent"

const testLocation = testEventInput.location.value as LocationCoordinate2D

const createEvents = async () => {
  await addMockLocationToDB(testLocation)

  const {
    attendeesList: [, attendee],
    host,
    eventIds: [futureEventId, ongoingEventId]
  } = await createEventFlow(
    [
      {
        dateRange: dateRange(
          dayjs().add(12, "hour").toDate(),
          dayjs().add(1, "year").toDate()
        )
      },
      {
        dateRange: dateRange(dayjs().toDate(), dayjs().add(1, "year").toDate())
      }
    ],
    1
  )

  return {
    attendee,
    host,
    ongoingEventId,
    futureEventId
  }
}

describe("exploreEvents endpoint tests", () => {
  it("should return 200 with the event, user relation, attendee count data in order of start time", async () => {
    const { attendee, ongoingEventId, futureEventId } = await createEvents()

    const resp = await testAPI.exploreEvents<200>({
      auth: attendee.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })

    expect(resp.status).toEqual(200)
    expect(resp.data.events).toHaveLength(2)
    const eventIds = [resp.data.events[0].id, resp.data.events[1].id]
    expect(eventIds).toContain(ongoingEventId)
    expect(eventIds).toContain(futureEventId)
  })

  it("should indicate that the user is attending an event", async () => {
    const { attendee } = await createEvents()

    const resp = await testAPI.exploreEvents<200>({
      auth: attendee.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })
    expect(resp.data.events[1].userAttendeeStatus).toEqual("attending")
  })

  it("should indicate that the user is not attending an event", async () => {
    const { attendee, futureEventId } = await createEvents()

    await testAPI.leaveEvent({
      auth: attendee.auth,
      params: { eventId: futureEventId }
    })

    const resp = await testAPI.exploreEvents<200>({
      auth: attendee.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })
    expect(resp.data.events[1].userAttendeeStatus).toEqual("not-participating")
  })

  it("should indicate that the user is hosting an event", async () => {
    const { host } = await createEvents()

    const resp = await testAPI.exploreEvents<200>({
      auth: host.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })
    expect(resp.data.events.map((e) => e.userAttendeeStatus)).toEqual([
      "hosting",
      "hosting"
    ])
  })

  it("should not return events that are not within the radius", async () => {
    const { attendee } = await createEvents()

    const events = await testAPI.exploreEvents<200>({
      auth: attendee.auth,
      body: {
        userLocation: {
          latitude: testLocation.latitude + 10,
          longitude: testLocation.longitude + 10
        },
        radius: 1
      }
    })
    console.log(events)
    expect(events.data.events).toHaveLength(0)
  })

  it("should remove the events where the attendee blocks the host", async () => {
    const { attendee, host } = await createEvents()

    await testAPI.blockUser(userToUserRequest(attendee, host))

    const events = await testAPI.exploreEvents<200>({
      auth: attendee.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })
    expect(events.data.events).toHaveLength(0)
  })

  it("should remove the events where the host blocks the attendee", async () => {
    const { attendee, host } = await createEvents()

    await testAPI.blockUser(userToUserRequest(host, attendee))

    const events = await testAPI.exploreEvents<200>({
      auth: attendee.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })
    expect(events.data.events).toHaveLength(0)
  })

  it("should not return events that have ended", async () => {
    const { attendee, host, futureEventId, ongoingEventId } =
      await createEvents()

    await testAPI.endEvent({
      auth: host.auth,
      params: { eventId: futureEventId }
    })

    const events = await testAPI.exploreEvents<200>({
      auth: attendee.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })
    expect(events.data.events.map((e) => e.id)).toEqual([ongoingEventId])
  })

  it("should not return past events that have ended naturally", async () => {
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
    const events = await testAPI.exploreEvents<200>({
      auth: user.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })
    expect(events.data.events.map((e) => e.id)).toEqual([])
  })

  it("should return all attendees for each event", async () => {
    const { attendee, futureEventId, host } = await createEvents()

    const users = await Promise.all([
      createUserFlow(),
      createUserFlow(),
      createUserFlow()
    ])

    // non-deterministic order on staging tests, so we need to add users in sequence
    for (let i = 0; i < users.length; i++) {
      await sleep(1000)
      await testAPI.joinEvent({
        auth: users[i].auth,
        params: { eventId: futureEventId }
      })
    }

    await testAPI.sendFriendRequest({
      auth: attendee.auth,
      params: { userId: users[1].id }
    })

    const resp = await testAPI.exploreEvents<200>({
      auth: attendee.auth,
      body: {
        userLocation: testLocation,
        radius: 50000
      }
    })
    const event = resp.data.events[1]
    expect(
      event.previewAttendees.map((a) => ({
        id: a.id,
        handle: a.handle,
        name: a.name,
        relationStatus: a.relationStatus
      }))
    ).toEqual([
      { ...userDetails(host), relationStatus: "not-friends" },
      { ...userDetails(attendee), relationStatus: "not-friends" },
      { ...userDetails(users[0]), relationStatus: "not-friends" },
      { ...userDetails(users[1]), relationStatus: "friend-request-sent" },
      { ...userDetails(users[2]), relationStatus: "not-friends" }
    ])
    expect(event.attendeeCount).toEqual(5)
  })
})
