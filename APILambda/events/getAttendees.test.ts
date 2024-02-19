import { conn } from "TiFBackendUtils"
import dayjs from "dayjs"
import {
  decodeAttendeesListCursor,
  encodeAttendeesListCursor
} from "../shared/Cursor.js"
import { AttendeesCursorResponse } from "../shared/SQL.js"
import {
  callGetAttendees, callSetArrival
} from "../test/apiCallers/events.js"
import { testEventInput } from "../test/testEvents.js"
import { createEventFlow } from "../test/userFlows/events.js"
import { TestUser, createUserFlow } from "../test/userFlows/users.js"
import { createEvent } from "./createEvent.js"

const eventLocation = { latitude: 50, longitude: 50 }
// TODO: should have a universal "lastpagecursor" value
const lastPageCursorResponse = {
  userId: "lastPage",
  joinDate: null,
  arrivedAt: null
}
const paginationLimit = 2

/**
 * Retrieve a response containing a list of attendees for a given event.
 *
 * @param {number} numOfAttendees - The number of additional attendees to simulate for testing purposes (default: 0).
 * @param {number} limit - The maximum number of attendees to include in the response (default: 5).
 * @returns {Promise<request.Response>} A Promise that resolves with the response containing the list of attendees.
 */
const getAttendeesListResponse = async ({
  numOfAttendees = 1
}: {
  numOfAttendees?: number,
}) => {
  const { attendeesList, eventIds: [testEventId] } = await createEventFlow([{ ...eventLocation }], numOfAttendees)

  return { attendeeToken: attendeesList?.[0]?.token, attendeesList, testEventId }
}

/**
 * Function to retrieve the next page cursor response based on the provided attendee information.
 *
 * @param {Array} testAttendees - An array containing information about all attendees.
 * @param {number} index - The index indicating the position of the attendee for which the response is generated.
 * @returns {AttendeesCursorResponse} - An object representing the next page cursor response with userId, joinDate, and arrivedAt properties.
 */
const getNextPageCursorResp = (
  testAttendees: Array<TestUser>,
  index: number
): AttendeesCursorResponse => {
  return {
    userId: testAttendees[index].userId,
    joinDate: index >= testAttendees.length
      ? expect.any(Date)
      : null,
    arrivedAt: index >= testAttendees.length
      ? expect.any(Date)
      : null
  }
}

describe("Testing for getting attendees list endpoint", () => {
  it("should return 400 if limit is less than one", async () => {
    const { attendeeToken, testEventId } = await getAttendeesListResponse({
      numOfAttendees: 1
    })

    const resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      0
    )

    expect(resp).toMatchObject({
      status: 400,
      body: {
        error: "invalid-request"
      }
    })
  })

  it("should return 400 if limit is greater than fifty", async () => {
    const { attendeeToken, testEventId } = await getAttendeesListResponse({
      numOfAttendees: 1
    })

    const resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      51
    )

    expect(resp).toMatchObject({
      status: 400,
      body: {
        error: "invalid-request"
      }
    })
  })

  it("should return 404 if attendee list is empty", async () => {
    const { token, userId } = await createUserFlow()

    const { value: { insertId } } = await createEvent(
      conn,
      {
        ...testEventInput,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(24, "hour").toDate()
      },
      userId
    )

    const resp = await callGetAttendees(
      token,
      Number(insertId),
      paginationLimit
    )

    expect(resp).toMatchObject({
      status: 404,
      body: {
        nextPageCursor: encodeAttendeesListCursor(lastPageCursorResponse),
        attendeesCount: 0,
        attendees: []
      }
    })
  })

  it("should return 404 if event doesn't exist", async () => {
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
    const { attendeesList, attendeeToken, testEventId } = await getAttendeesListResponse({
      numOfAttendees: 2
    })

    const resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit
    )

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: attendeesList
          .slice(0, 2)
          .map(({ userId: id, name }) => ({
            id,
            name
          })),
        nextPageCursor: getNextPageCursorResp(attendeesList, 1),
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
    const { attendeesList, attendeeToken, testEventId } = await getAttendeesListResponse({
      numOfAttendees: 4
    })

    let resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit
    )

    const middlePageCursorResp = resp.body.nextPageCursor
    resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit,
      middlePageCursorResp
    )

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: attendeesList
          .slice(2, 4)
          .map(({ userId: id, name }) => ({
            id,
            name
          })),
        nextPageCursor: getNextPageCursorResp(attendeesList, 3),
        attendeesCount: 5
      }
    })
  })

  it("should return 200 after paginating the last page of attendees list", async () => {
    const { attendeesList, attendeeToken, testEventId } = await getAttendeesListResponse({
      numOfAttendees: 2
    })

    let resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit
    )

    const lastPageCursorResp = resp.body.nextPageCursor

    resp = await callGetAttendees(
      attendeeToken,
      testEventId,
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
            id: attendeesList[attendeesList.length - 1].userId,
            name: attendeesList[attendeesList.length - 1].name
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        attendeesCount: 3
      }
    })
  })

  it("should return 200 if going past last page of attendees list", async () => {
    const { attendeeToken, testEventId } = await getAttendeesListResponse({
      numOfAttendees: 2
    })

    let resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit
    )

    const lastPageCursorResp = resp.body.nextPageCursor

    resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit,
      lastPageCursorResp
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
    const { attendeeToken, attendeesList, testEventId } = await getAttendeesListResponse(
      { numOfAttendees: 3 }
    )

    await callSetArrival(attendeesList[0].token, { coordinate: eventLocation })
    await callSetArrival(attendeesList[1].token, { coordinate: eventLocation })

    let resp = await callGetAttendees(
      attendeeToken,
      testEventId,
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
            id: attendeesList[0].userId,
            name: attendeesList[0].name,
            joinTimestamp: expect.any(Date),
            arrivalStatus: true,
            arrivedAt: expect.any(Date)
          },
          {
            id: attendeesList[1].userId,
            name: attendeesList[1].name,
            joinTimestamp: expect.any(Date),
            arrivalStatus: true,
            arrivedAt: expect.any(Date)
          }
        ],
        nextPageCursor: getNextPageCursorResp(attendeesList, 1),
        attendeesCount: 4
      }
    })

    resp.body.nextPageCursor = encodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    const lastPageCursorResp = resp.body.nextPageCursor
    resp = await callGetAttendees(
      attendeeToken,
      testEventId,
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
            id: attendeesList[2].userId,
            joinTimestamp: expect.any(Date),
            name: attendeesList[2].name,
            arrivalStatus: false,
            arrivedAt: undefined
          },
          {
            id: attendeesList[3].userId,
            joinTimestamp: expect.any(Date),
            name: attendeesList[3].name,
            arrivalStatus: false,
            arrivedAt: undefined
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        attendeesCount: 4
      }
    })
  })
})
