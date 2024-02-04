import dayjs from "dayjs"
import {
  decodeAttendeesListCursor
} from "../shared/Cursor.js"
import { DatabaseAttendee } from "../shared/SQL.js"
import {
  callGetAttendees
} from "../test/apiCallers/events.js"
import { createEventFlow } from "../test/userFlows/events.js"
import { createUserFlow } from "../test/userFlows/users.js"

const lastPageCursorResponse = {
  userId: "lastPage",
  joinDate: null
}
const paginationLimit = 2

/**
 * Retrieve a response containing a list of attendees for a given event.
 *
 * @param {number} numOfAttendees - The number of additional attendees to simulate for testing purposes (default: 0).
 * @param {number} limit - The maximum number of attendees to include in the response (default: 5).
 * @returns {Promise<request.Response>} A Promise that resolves with the response containing the list of attendees.
 */
const getAllAttendeesListResponse = async ({
  numOfAttendees = 1,
  limit = 5
}: {
  numOfAttendees?: number,
  limit?: number
}) => {
  const { attendeesList: [{ token: attendeeToken }], eventIds: [eventTestId] } = await createEventFlow([{}], numOfAttendees)

  const resp = await callGetAttendees(
    attendeeToken,
    eventTestId,
    limit
  )
  return { resp, attendeeToken, eventTestId }
}

describe("Testing for getting attendees list endpoint", () => {
  it("should return 400 if limit is less than one", async () => {
    const { resp } = await getAllAttendeesListResponse({
      numOfAttendees: 1,
      limit: 0
    })

    expect(resp).toMatchObject({
      status: 400,
      body: {
        error: "invalid-request"
      }
    })
  })

  it("should return 400 if limit is greater than fifty", async () => {
    const { resp } = await getAllAttendeesListResponse({
      numOfAttendees: 1,
      limit: 51
    })

    expect(resp).toMatchObject({
      status: 400,
      body: {
        error: "invalid-request"
      }
    })
  })

  it("should return 404 if attendee list is empty", async () => {
    const { token } = await createUserFlow()

    const eventId = 9999
    const resp = await callGetAttendees(
      token,
      eventId,
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
    const { resp: allAttendeesResp, attendeeToken, eventTestId } = await getAllAttendeesListResponse({
      numOfAttendees: 2
    })

    const resp = await callGetAttendees(
      attendeeToken,
      eventTestId,
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
        attendeesCount: 3
      }
    })
  })

  it("should return 200 after paginating first page with one attendee", async () => {
    const { token } = await createUserFlow()
    const { host, eventIds: [eventId] } = await createEventFlow()

    const resp = await callGetAttendees(
      token,
      eventId,
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
            id: host.userId,
            name: host.name
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        attendeesCount: 1
      }
    })
  })

  it("should return 200 after paginating middle of page", async () => {
    const { resp: allAttendeesResp, attendeeToken, eventTestId } = await getAllAttendeesListResponse({
      numOfAttendees: 4
    })

    const allAttendees = allAttendeesResp.body.attendees

    let resp = await callGetAttendees(
      attendeeToken,
      eventTestId,
      paginationLimit
    )

    const middlePageCursorResp = resp.body.nextPageCursor
    resp = await callGetAttendees(
      attendeeToken,
      eventTestId,
      paginationLimit,
      middlePageCursorResp
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
        attendeesCount: 5
      }
    })
  })

  it("should return 200 after paginating the last page of attendees list", async () => {
    const { resp: allAttendeesResp, attendeeToken, eventTestId } = await getAllAttendeesListResponse({
      numOfAttendees: 2
    })
    const allAttendees = allAttendeesResp.body.attendees

    let resp = await callGetAttendees(
      attendeeToken,
      eventTestId,
      paginationLimit
    )

    const lastPageCursorResp = resp.body.nextPageCursor

    resp = await callGetAttendees(
      attendeeToken,
      eventTestId,
      paginationLimit,
      lastPageCursorResp
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
        attendeesCount: 3
      }
    })
  })
})
