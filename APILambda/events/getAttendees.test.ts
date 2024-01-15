import dayjs from "dayjs"
import { createEventFlow } from "../test/userFlows/events.js"
import {
  callGetAttendees,
  callJoinEvent,
  callLeaveEvent
} from "../test/apiCallers/events.js"
import { encodeAttendeesListCursor } from "../shared/Cursor.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Join the event by id tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }
  const limit = 2
  const initialCursorObject = {
    userId: "firstPage",
    joinDate: dayjs("1970-01-01T00:00:00Z").toDate()
  }
  const lastPageCursorResponse = /"userId":"lastPage","joinDate":null/

  it("should return 400 if limit is less than one", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const firstPageCursorResp = encodeAttendeesListCursor(initialCursorObject)
    const resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      firstPageCursorResp,
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

    const firstPageCursorResp = encodeAttendeesListCursor(initialCursorObject)
    const resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      firstPageCursorResp,
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

    const firstPageCursorResp = encodeAttendeesListCursor(initialCursorObject)
    const eventId = 9999
    const resp = await callGetAttendees(
      token,
      eventId,
      firstPageCursorResp,
      limit
    )

    expect(resp).toMatchObject({
      status: 404,
      body: expect.objectContaining({
        nextPageCursor: expect.stringMatching(lastPageCursorResponse),
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

    const firstPageCursorResp = encodeAttendeesListCursor(initialCursorObject)
    const resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      firstPageCursorResp,
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
        nextPageCursor: expect.anything(),
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

    const firstPageCursorResp = encodeAttendeesListCursor(initialCursorObject)
    let resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      firstPageCursorResp,
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
        nextPageCursor: expect.stringMatching(lastPageCursorResponse),
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

    const firstPageCursorResp = encodeAttendeesListCursor(initialCursorObject)
    let resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      firstPageCursorResp,
      limit
    )

    const lastPageCursorResp = encodeAttendeesListCursor(
      JSON.parse(resp.body.nextPageCursor)
    )
    resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      lastPageCursorResp,
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
        nextPageCursor: expect.stringMatching(lastPageCursorResponse),
        attendeesCount: expect.anything()
      })
    })
  })
})
