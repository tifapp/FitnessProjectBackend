import dayjs from "dayjs"
import { createEventFlow } from "../test/userFlows/events.js"
import { callGetAttendees, callJoinEvent } from "../test/apiCallers/events.js"
import { encodeCursor } from "../shared/Cursor.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Join the event by id tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }
  const limit = 2
  const defaultJoinDate = "1970-01-01T00:00:00Z"

  it("should return 400 if limit is less than one", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const nextCursor = encodeCursor(null, dayjs(defaultJoinDate).toDate())

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

    const nextCursor = encodeCursor(null, dayjs(defaultJoinDate).toDate())

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

    const nextCursor = encodeCursor(null, dayjs(defaultJoinDate).toDate())
    const eventId = 9999

    // Initial cursor
    const resp = await callGetAttendees(token, eventId, nextCursor, limit)

    expect(resp).toMatchObject({
      status: 404,
      body: []
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
      null,
      dayjs("1970-01-01T00:00:00Z").toDate()
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
            handle: expect.any(String),
            id: expect.any(String),
            joinTimestamp: null,
            name: expect.any(String),
            profileImageURL: null,
            themToYouStatus: null,
            youToThemStatus: null
          }),
          expect.objectContaining({
            handle: expect.any(String),
            id: expect.any(String),
            joinTimestamp: null,
            name: expect.any(String),
            profileImageURL: null,
            themToYouStatus: null,
            youToThemStatus: null
          })
        ]),
        nextPageJoinDate: null,
        nextPageUserId: expect.any(String)
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

    let nextCursor = encodeCursor(null, dayjs("1970-01-01T00:00:00Z").toDate())

    // Initial cursor
    let resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      limit
    )

    let { nextPageUserId, nextPageJoinDate } = resp.body

    nextCursor = encodeCursor(nextPageUserId, nextPageJoinDate)

    // Next cursor
    resp = await callGetAttendees(attendeeToken, eventIds[0], nextCursor, limit)

    expect(resp).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        attendees: expect.arrayContaining([
          expect.objectContaining({
            handle: expect.any(String),
            id: expect.any(String),
            joinTimestamp: null,
            name: expect.any(String),
            profileImageURL: null,
            themToYouStatus: null,
            youToThemStatus: null
          })
        ]),
        nextPageJoinDate: null,
        nextPageUserId: null
      })
    })
  })
})
