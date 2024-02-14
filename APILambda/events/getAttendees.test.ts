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
import { callBlockUser } from "../test/apiCallers/users.js"

const eventLocation = { latitude: 50, longitude: 50 }
const lastPageCursorResponse = {
  userId: "lastPage",
  joinDate: null,
  arrivedAt: null
}
const paginationLimit = 2

let attendeeTestToken: string
let attendeeTestId: string
let hostTestToken: string
let hostTestId: string
let eventTestId: number

/**
 * Create a new event with a specified location and time range.
 *
 * @returns {Promise<void>} A Promise that resolves after creating the event and obtaining attendee and event IDs.
 */
const createEvent = async (): Promise<void> => {
  const { attendeeToken, attendeeId, hostToken, hostId, eventIds } =
    await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

  attendeeTestToken = attendeeToken
  attendeeTestId = attendeeId
  hostTestToken = hostToken
  hostTestId = hostId
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
  numAttendeesBlockingViewer: number = 0,
  numViewerBlockingAttendees: number = 0,
  limit: number = 5
) => {
  let numAttendeesBlockingViewerCounter = 0
  let numViewerBlockingAttendeesCounter = 0
  for (let i = 0; i < numOfAdditionalAttendees; i++) {
    const { token: attendeeToken, userId: attendeeUserId } =
      await createUserFlow()
    await callJoinEvent(attendeeToken, eventTestId)
    await callSetArrival(attendeeToken, { coordinate: eventLocation })

    if (numAttendeesBlockingViewerCounter < numAttendeesBlockingViewer) {
      await callBlockUser(attendeeToken, attendeeTestId)
      numAttendeesBlockingViewerCounter += 1
    }

    if (numViewerBlockingAttendeesCounter < numViewerBlockingAttendees) {
      await callBlockUser(attendeeTestToken, attendeeUserId)
      numViewerBlockingAttendeesCounter += 1
    }
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
      0,
      0,
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
      0,
      0,
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
        totalAttendeeCount: 0,
        attendees: []
      }
    })
  })

  it("should return 200 after paginating the first page of attendees list", async () => {
    const numOfAdditionalAttendees = 2
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
        attendees: [
          {
            id: allAttendees[0].id,
            name: allAttendees[0].name,
            role: "host"
          },
          {
            id: allAttendees[1].id,
            name: allAttendees[1].name,
            role: "attendee"
          }
        ],
        nextPageCursor: getNextPageCursorResp(allAttendees, 1),
        totalAttendeeCount: 4
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
            name: allAttendees[0].name,
            role: "host"
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 1
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
            name: attendee.name,
            role: "attendee"
          })),
        nextPageCursor: getNextPageCursorResp(allAttendees, 3),
        totalAttendeeCount: 5
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
            name: allAttendees[allAttendees.length - 1].name,
            role: "attendee"
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 3
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
        totalAttendeeCount: 2
      }
    })
  })

  it("check that attendees who arrived first or host are on top of the attendees list", async () => {
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
            arrivalStatus: false,
            role: "host",
            arrivedAt: allAttendees[0].arrivedAt
          },
          {
            id: allAttendees[1].id,
            name: allAttendees[1].name,
            joinTimestamp: allAttendees[1].joinTimestamp,
            arrivalStatus: true,
            role: "attendee",
            arrivedAt: allAttendees[1].arrivedAt
          }
        ],
        nextPageCursor: getNextPageCursorResp(allAttendees, 1),
        totalAttendeeCount: 4
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
            arrivalStatus: true,
            role: "attendee",
            arrivedAt: allAttendees[2].arrivedAt
          },
          {
            id: allAttendees[3].id,
            joinTimestamp: allAttendees[3].joinTimestamp,
            name: allAttendees[3].name,
            arrivalStatus: false,
            role: "attendee",
            arrivedAt: allAttendees[3].arrivedAt
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 4
      }
    })
  })

  it("should return total attendee count and attendees who did not block viewer", async () => {
    const numOfAdditionalAttendees = 3
    const numAttendeesBlockingViewer = 2
    const numViewerBlockingAttendees = 0

    const allAttendeesResp = await getAllAttendeesListResponse(
      numOfAdditionalAttendees,
      numAttendeesBlockingViewer,
      numViewerBlockingAttendees
    )

    const allAttendees = allAttendeesResp.body.attendees

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
            joinTimestamp: allAttendees[0].joinTimestamp,
            name: allAttendees[0].name,
            arrivalStatus: false,
            role: "host",
            arrivedAt: allAttendees[0].arrivedAt,
            relations: { youToThem: "not-friends", themToYou: "not-friends" }
          },
          {
            id: allAttendees[1].id,
            joinTimestamp: allAttendees[1].joinTimestamp,
            name: allAttendees[1].name,
            arrivalStatus: true,
            role: "attendee",
            arrivedAt: allAttendees[1].arrivedAt,
            relations: { youToThem: "not-friends", themToYou: "not-friends" }
          }
        ],
        nextPageCursor: getNextPageCursorResp(allAttendees, 1),
        totalAttendeeCount: 3
      }
    })
  })

  it("should return 403 if host blocked viewing user", async () => {
    await callBlockUser(hostTestToken, attendeeTestId)

    const firstPageCursorResp = encodeAttendeesListCursor()
    let resp = await callGetAttendees(
      attendeeTestToken,
      eventTestId,
      firstPageCursorResp,
      paginationLimit
    )

    expect(resp).toMatchObject({
      status: 403
    })
  })

  it("should hide attendees that block the viewer and the viewer blocks them", async () => {
    const numOfAdditionalAttendees = 2
    const numViewerBlockingAttendees = 2
    const numAttendeesBlockingViewer = 2

    const allAttendeesResp = await getAllAttendeesListResponse(
      numOfAdditionalAttendees,
      numAttendeesBlockingViewer,
      numViewerBlockingAttendees
    )

    const allAttendees = allAttendeesResp.body.attendees

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
            joinTimestamp: allAttendees[0].joinTimestamp,
            name: allAttendees[0].name,
            arrivalStatus: false,
            role: "host",
            arrivedAt: allAttendees[0].arrivedAt,
            relations: { youToThem: "not-friends", themToYou: "not-friends" }
          },
          {
            id: allAttendees[1].id,
            joinTimestamp: allAttendees[1].joinTimestamp,
            name: allAttendees[1].name,
            arrivalStatus: false,
            role: "attendee",
            arrivedAt: allAttendees[1].arrivedAt,
            relations: { youToThem: "not-friends", themToYou: "not-friends" }
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 2
      }
    })
  })

  it("should check that blocked users and total attendees count are not hidden from attendees list \
   when user blocks an attendee and the host", async () => {
    await callBlockUser(attendeeTestToken, hostTestId)

    const numOfAdditionalAttendees = 2
    const numViewerBlockingAttendees = 1
    const numAttendeesBlockingViewer = 0
    const allAttendeesResp = await getAllAttendeesListResponse(
      numOfAdditionalAttendees,
      numAttendeesBlockingViewer,
      numViewerBlockingAttendees
    )

    const allAttendees = allAttendeesResp.body.attendees
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
            joinTimestamp: allAttendees[0].joinTimestamp,
            name: allAttendees[0].name,
            arrivalStatus: false,
            role: "host",
            arrivedAt: allAttendees[0].arrivedAt,
            relations: { youToThem: "blocked", themToYou: "not-friends" }
          },
          {
            id: allAttendees[1].id,
            joinTimestamp: allAttendees[1].joinTimestamp,
            name: allAttendees[1].name,
            arrivalStatus: true,
            role: "attendee",
            arrivedAt: allAttendees[1].arrivedAt,
            relations: { youToThem: "blocked", themToYou: "not-friends" }
          }
        ],
        nextPageCursor: getNextPageCursorResp(allAttendees, 1),
        totalAttendeeCount: 4
      }
    })
  })

  it("should return 403 if trying to see attendees list when host and user block each other", async () => {
    await callBlockUser(hostTestToken, attendeeTestId)
    await callBlockUser(attendeeTestToken, hostTestId)

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
      status: 403
    })
  })
})
