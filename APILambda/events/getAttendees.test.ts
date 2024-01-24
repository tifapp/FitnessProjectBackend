import dayjs from "dayjs"
import { createEventFlow } from "../test/userFlows/events.js"
import {
  callGetAttendees,
  callJoinEvent,
  callLeaveEvent
} from "../test/apiCallers/events.js"
import {
  decodeAttendeesListCursor,
  encodeAttendeesListCursor
} from "../shared/Cursor.js"
import { createUserFlow } from "../test/userFlows/users.js"
import { DatabaseAttendee } from "../shared/SQL.js"

const eventLocation = { latitude: 50, longitude: 50 }
const lastPageCursorResponse = {
  userId: "lastPage",
  joinDate: dayjs("1970-01-01T00:00:00.000Z").toDate()
}
const paginationLimit = 2

let attendeeTestToken: string
let eventTestId: number

/**
 * Create a new event with a specified location and time range.
 *
 * @returns {Promise<void>} A Promise that resolves after creating the event and obtaining attendee and event IDs.
 */
const createEvent = async () => {
  const { attendeeToken, eventIds } = await createEventFlow([
    {
      ...eventLocation,
      startTimestamp: dayjs().add(12, "hour").toDate(),
      endTimestamp: dayjs().add(1, "year").toDate()
    }
  ])

  attendeeTestToken = attendeeToken
  eventTestId = eventIds[0]
}

/**
 * Retrieve a response containing a list of attendees for a given event.
 *
 * @param {number} numOfAdditionalAttendees - The number of additional attendees to simulate for testing purposes (default: 0).
 * @param {number} limit - The maximum number of attendees to include in the response (default: 5).
 * @returns {Promise<request.Response>} A Promise that resolves with the response containing the list of attendees.
 */
const getAllAttendeesListResponse = async (
  numOfAdditionalAttendees: number = 0,
  limit: number = 5
) => {
  for (let i = 0; i < numOfAdditionalAttendees; i++) {
    const { token: attendeeToken } = await createUserFlow()
    await callJoinEvent(attendeeToken, eventTestId)
  }

  const firstPageCursorResp = encodeAttendeesListCursor()
  const resp = await callGetAttendees(
    attendeeTestToken,
    eventTestId,
    firstPageCursorResp,
    limit
  )
  return resp
}

describe("Testing for getting attendees list endpoint", () => {
  beforeEach(createEvent)

  it("should return 400 if limit is less than one", async () => {
    const numOfAdditionalAttendees = 0
    const limit = 0
    const resp = await getAllAttendeesListResponse(
      numOfAdditionalAttendees,
      limit
    )

    expect(resp).toMatchObject({
      status: 400,
      body: {
        error: "invalid-request"
      }
    })
  })

  it("should return 400 if limit is greater than fifty", async () => {
    const numOfAdditionalAttendees = 0
    const limit = 51
    const resp = await getAllAttendeesListResponse(
      numOfAdditionalAttendees,
      limit
    )

    expect(resp).toMatchObject({
      status: 400,
      body: {
        error: "invalid-request"
      }
    })
  })

  it("should return 404 if attendee list is empty", async () => {
    const { token } = await createUserFlow()

    const firstPageCursorResp = encodeAttendeesListCursor()
    const eventId = 9999
    const resp = await callGetAttendees(
      token,
      eventId,
      firstPageCursorResp,
      paginationLimit
    )

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 404,
      body: {
        nextPageCursor: lastPageCursorResponse,
        attendeesCount: 0,
        attendees: []
      }
    })
  })

  it("should return 200 after paginating the first page of attendees list", async () => {
    const allAttendeesResp = await getAllAttendeesListResponse(1)

    const firstPageCursorResp = encodeAttendeesListCursor()
    const resp = await callGetAttendees(
      attendeeTestToken,
      eventTestId,
      firstPageCursorResp,
      paginationLimit
    )

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )
    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: allAttendeesResp.body.attendees
          .slice(0, 2)
          .map((attendee: DatabaseAttendee) => ({
            id: attendee.id,
            name: attendee.name
          })),
        nextPageCursor: {
          userId: allAttendeesResp.body.attendees[paginationLimit - 1].id,
          joinDate: dayjs(
            allAttendeesResp.body.attendees[paginationLimit - 1].joinTimestamp
          ).toDate()
        },
        attendeesCount: paginationLimit
      }
    })
  })

  it("should return 200 after paginating first page with one attendee", async () => {
    await callLeaveEvent(attendeeTestToken, eventTestId)
    const allAttendeesResp = await getAllAttendeesListResponse()

    const firstPageCursorResp = encodeAttendeesListCursor()
    let resp = await callGetAttendees(
      attendeeTestToken,
      eventTestId,
      firstPageCursorResp,
      paginationLimit
    )

    const allAttendees = allAttendeesResp.body.attendees
    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: [
          {
            id: allAttendees[0].id,
            name: allAttendees[0].name
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        attendeesCount: 1
      }
    })
  })

  it("should return 200 after paginating middle of page", async () => {
    const numOfAdditionalAttendees = 3
    const allAttendeesResp = await getAllAttendeesListResponse(
      numOfAdditionalAttendees
    )

    const allAttendees = allAttendeesResp.body.attendees

    const firstPageCursorResp = encodeAttendeesListCursor()
    let resp = await callGetAttendees(
      attendeeTestToken,
      eventTestId,
      firstPageCursorResp,
      paginationLimit
    )

    const middlePageCursorResp = resp.body.nextPageCursor
    resp = await callGetAttendees(
      attendeeTestToken,
      eventTestId,
      middlePageCursorResp,
      paginationLimit
    )

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: allAttendees
          .slice(2, 4)
          .map((attendee: DatabaseAttendee) => ({
            id: attendee.id,
            name: attendee.name
          })),
        nextPageCursor: {
          userId: allAttendees[3].id,
          joinDate: dayjs(allAttendees[3].joinTimestamp).toDate()
        },
        attendeesCount: paginationLimit
      }
    })
  })

  it("should return 200 after paginating the last page of attendees list", async () => {
    const allAttendeesResp = await getAllAttendeesListResponse(1)
    const allAttendees = allAttendeesResp.body.attendees

    const firstPageCursorResp = encodeAttendeesListCursor()
    let resp = await callGetAttendees(
      attendeeTestToken,
      eventTestId,
      firstPageCursorResp,
      paginationLimit
    )

    const lastPageCursorResp = resp.body.nextPageCursor

    resp = await callGetAttendees(
      attendeeTestToken,
      eventTestId,
      lastPageCursorResp,
      paginationLimit
    )

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: [
          {
            id: allAttendees[allAttendees.length - 1].id,
            name: allAttendees[allAttendees.length - 1].name
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        attendeesCount: 1
      }
    })
  })
})
