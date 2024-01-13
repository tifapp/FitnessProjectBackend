import dayjs from "dayjs"
import { createEventFlow } from "../test/userFlows/events.js"
import {
  callGetAttendees,
  callJoinEvent,
  callLeaveEvent
} from "../test/apiCallers/events.js"
import { encodeCursor } from "../shared/Cursor.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Join the event by id tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }
  const limit = 2
  const initialUserIdCursor = "firstPage"
  const initialJoinDateCursor = "1970-01-01T00:00:00Z"

  it("should return 400 if limit is less than one", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const nextCursor = encodeCursor(
      initialUserIdCursor,
      dayjs(initialJoinDateCursor).toDate()
    )

    // Initial cursor
    const resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      0
    )

    expect(resp).toMatchObject({
      status: 400,
      body: expect.objectContaining({
        error: "invalid-request"
      })
    })
  })

  it("should return 400 if limit is greater than fifty", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const nextCursor = encodeCursor(
      initialUserIdCursor,
      dayjs(initialJoinDateCursor).toDate()
    )

    // Initial cursor
    const resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      51
    )

    expect(resp).toMatchObject({
      status: 400,
      body: expect.objectContaining({
        error: "invalid-request"
      })
    })
  })

  it("should return 404 if attendee list is empty", async () => {
    const { token } = await createUserFlow()

    const nextCursor = encodeCursor(
      initialUserIdCursor,
      dayjs(initialJoinDateCursor).toDate()
    )
    const eventId = 9999

    // Initial cursor
    const resp = await callGetAttendees(token, eventId, nextCursor, limit)

    expect(resp).toMatchObject({
      status: 404,
      body: expect.objectContaining({
        nextPageUserIdCursor: "lastPage",
        nextPageJoinDateCursor: null,
        attendeesCount: 0,
        attendees: []
      })
    })
  })

  it("should return 200 after paginating the first page of attendees list", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const { token: attendeeToken2 } = await createUserFlow()
    await callJoinEvent(attendeeToken2, eventIds[0])

    const nextCursor = encodeCursor(
      initialUserIdCursor,
      dayjs(initialJoinDateCursor).toDate()
    )

    // Initial cursor
    const resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      limit
    )

    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        attendees: expect.arrayContaining([
          expect.objectContaining({
            handle: expect.anything(),
            id: expect.anything(),
            joinTimestamp: null,
            name: expect.anything(),
            profileImageURL: null,
            relations: { youToThem: null, themToYou: null }
          }),
          expect.objectContaining({
            handle: expect.anything(),
            id: expect.anything(),
            joinTimestamp: null,
            name: expect.anything(),
            profileImageURL: null,
            relations: { youToThem: null, themToYou: null }
          })
        ]),
        nextPageJoinDateCursor: null,
        nextPageUserIdCursor: expect.anything(),
        attendeesCount: expect.anything()
      })
    })
  })

  it("should return 200 after paginating first page with one attendee", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    await callLeaveEvent(attendeeToken, eventIds[0])

    // Initial cursor
    let nextCursor = encodeCursor(
      initialUserIdCursor,
      dayjs(initialJoinDateCursor).toDate()
    )

    let resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      limit
    )

    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        attendees: expect.arrayContaining([
          expect.objectContaining({
            handle: expect.anything(),
            id: expect.anything(),
            joinTimestamp: null,
            name: expect.anything(),
            profileImageURL: null,
            relations: { youToThem: null, themToYou: null }
          })
        ]),
        nextPageUserIdCursor: "lastPage",
        nextPageJoinDateCursor: null,
        attendeesCount: expect.anything()
      })
    })
  })

  it("should return 200 after paginating the last page of attendees list", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const { token: attendeeToken2 } = await createUserFlow()
    await callJoinEvent(attendeeToken2, eventIds[0])

    // Initial cursor
    let nextCursor = encodeCursor(
      initialUserIdCursor,
      dayjs(initialJoinDateCursor).toDate()
    )

    let resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      limit
    )

    let { nextPageUserIdCursor, nextPageJoinDateCursor } = resp.body

    // Next cursor
    nextCursor = encodeCursor(nextPageUserIdCursor, nextPageJoinDateCursor)
    resp = await callGetAttendees(attendeeToken, eventIds[0], nextCursor, limit)

    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        attendees: expect.arrayContaining([
          expect.objectContaining({
            handle: expect.anything(),
            id: expect.anything(),
            joinTimestamp: null,
            name: expect.anything(),
            profileImageURL: null,
            relations: { youToThem: null, themToYou: null }
          })
        ]),
        nextPageUserIdCursor: "lastPage",
        nextPageJoinDateCursor: null,
        attendeesCount: expect.anything()
      })
    })
  })
})
