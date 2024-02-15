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
import { AttendeesCursorResponse, DatabaseAttendee } from "../shared/SQL.js"
import { callSetArrival } from "../test/apiCallers/events.js"

const eventLocation = { latitude: 50, longitude: 50 }
const lastPageCursorResponse = {
  userId: "lastPage",
  joinDate: null,
  arrivedAt: null
}
const paginationLimit = 2

let attendeeTestToken: string
let eventTestId: number

/**
 * Create a new event with a specified location and time range.
 *
 * @returns {Promise<void>} A Promise that resolves after creating the event and obtaining attendee and event IDs.
 */
const createEvent = async (): Promise<void> => {
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
    await callSetArrival(attendeeToken, { coordinate: eventLocation })
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

/**
 * Function to retrieve the next page cursor response based on the provided attendee information.
 *
 * @param {Array} allAttendees - An array containing information about all attendees.
 * @param {number} index - The index indicating the position of the attendee for which the response is generated.
 * @returns {AttendeesCursorResponse} - An object representing the next page cursor response with userId, joinDate, and arrivedAt properties.
 */
const getNextPageCursorResp = (
  allAttendees: Array<DatabaseAttendee>,
  index: number
): AttendeesCursorResponse => {
  return {
    userId: allAttendees[index].id,
    joinDate: allAttendees[index].joinTimestamp
      ? dayjs(allAttendees[index].joinTimestamp).toDate()
      : null,
    arrivedAt: allAttendees[index].arrivedAt
      ? dayjs(allAttendees[index].arrivedAt).toDate()
      : null
  }
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
    const numOfAdditionalAttendees = 1
    const allAttendeesResp = await getAllAttendeesListResponse(
      numOfAdditionalAttendees
    )
    const allAttendees = allAttendeesResp.body.attendees

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
        attendees: allAttendees
          .slice(0, 2)
          .map((attendee: DatabaseAttendee) => ({
            id: attendee.id,
            name: attendee.name
          })),
        nextPageCursor: getNextPageCursorResp(allAttendees, 1),
        attendeesCount: 3
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
        nextPageCursor: getNextPageCursorResp(allAttendees, 3),
        attendeesCount: 5
      }
    })
  })

  it("should return 200 after paginating the last page of attendees list", async () => {
    const numOfAdditionalAttendees = 1
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
        attendeesCount: 3
      }
    })
  })

  it("should return 200 if going past last page of attendees list", async () => {
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
        attendees: [],
        nextPageCursor: lastPageCursorResponse,
        attendeesCount: 2
      }
    })
  })

  it("check that attendees who arrived first are on top of the attendees list", async () => {
    const numOfAdditionalAttendees = 2
    const allAttendeesResp = await getAllAttendeesListResponse(
      numOfAdditionalAttendees
    )
    
    const allAttendees = allAttendeesResp.body.attendees

    allAttendeesResp.body.nextPageCursor = decodeAttendeesListCursor(
      allAttendeesResp.body.nextPageCursor
    )

    const firstPageCursorResp = encodeAttendeesListCursor()
    let resp = await callGetAttendees(
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
        attendees: [
          {
            id: allAttendees[0].id,
            name: allAttendees[0].name,
            joinTimestamp: allAttendees[0].joinTimestamp,
            arrivalStatus: true,
            arrivedAt: allAttendees[0].arrivedAt
          },
          {
            id: allAttendees[1].id,
            name: allAttendees[1].name,
            joinTimestamp: allAttendees[1].joinTimestamp,
            arrivalStatus: true,
            arrivedAt: allAttendees[1].arrivedAt
          }
        ],
        nextPageCursor: getNextPageCursorResp(allAttendees, 1),
        attendeesCount: 4
      }
    })

    resp.body.nextPageCursor = encodeAttendeesListCursor(
      resp.body.nextPageCursor
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
            id: allAttendees[2].id,
            joinTimestamp: allAttendees[2].joinTimestamp,
            name: allAttendees[2].name,
            arrivalStatus: false,
            arrivedAt: allAttendees[2].arrivedAt
          },
          {
            id: allAttendees[3].id,
            joinTimestamp: allAttendees[3].joinTimestamp,
            name: allAttendees[3].name,
            arrivalStatus: false,
            arrivedAt: allAttendees[3].arrivedAt
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        attendeesCount: 4
      }
    })
  })
})
