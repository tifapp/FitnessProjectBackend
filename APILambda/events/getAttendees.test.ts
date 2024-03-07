import { conn } from "TiFBackendUtils"
import dayjs from "dayjs"
import { decodeAttendeesListCursor } from "../shared/Cursor.js"
import { AttendeesCursorResponse } from "../shared/SQL.js"
import { callGetAttendees, callSetArrival } from "../test/apiCallers/events.js"
import { callBlockUser } from "../test/apiCallers/users.js"
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

const createTestAttendeesList = async ({
  numOfAttendees = 1
}: {
  numOfAttendees?: number
}) => {
  const {
    attendeesList,
    eventIds: [testEventId],
    host
  } = await createEventFlow([{ ...eventLocation }], numOfAttendees)

  return {
    attendeeToken: attendeesList?.[0]?.token,
    attendeesList,
    testEventId,
    host
  }
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
): Omit<AttendeesCursorResponse, "arrivedAt"> => {
  return {
    userId: testAttendees[index].userId,
    joinDate: index >= testAttendees.length ? null : expect.any(Date)
  }
}

describe("getAttendeesList endpoint", () => {
  it("should return 400 if limit is less than one", async () => {
    const { attendeeToken, testEventId } = await createTestAttendeesList({
      numOfAttendees: 1
    })

    const resp = await callGetAttendees(attendeeToken, testEventId, 0)

    expect(resp).toMatchObject({
      status: 400,
      body: {
        error: "invalid-request"
      }
    })
  })

  it("should return 400 if limit is greater than fifty", async () => {
    const { attendeeToken, testEventId } = await createTestAttendeesList({
      numOfAttendees: 1
    })

    const resp = await callGetAttendees(attendeeToken, testEventId, 51)

    expect(resp).toMatchObject({
      status: 400,
      body: {
        error: "invalid-request"
      }
    })
  })

  it("should return 404 if attendee list is empty", async () => {
    const currentUser = await createUserFlow()

    const {
      value: { insertId }
    } = await createEvent(
      conn,
      {
        ...testEventInput,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(24, "hour").toDate()
      },
      currentUser.userId
    )

    const resp = await callGetAttendees(
      currentUser.token,
      Number(insertId),
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

  it("should return 404 if event doesn't exist", async () => {
    const currentUser = await createUserFlow()

    const eventId = 9999
    const resp = await callGetAttendees(
      currentUser.token,
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
        totalAttendeeCount: 0,
        attendees: []
      }
    })
  })

  it("should return 200 after paginating the first page of attendees list", async () => {
    const { attendeesList, attendeeToken, testEventId, host } =
      await createTestAttendeesList({
        numOfAttendees: 3
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
        attendees: [
          {
            id: host.userId,
            name: host.name,
            role: "hosting"
          },
          {
            id: attendeesList[0].userId,
            name: attendeesList[0].name,
            role: "attending"
          }
        ],
        nextPageCursor: getNextPageCursorResp([host, ...attendeesList], 1),
        totalAttendeeCount: 4
      }
    })
  })

  it("should return 200 after paginating first page with one attendee", async () => {
    const currentUser = await createUserFlow()
    const {
      host,
      eventIds: [eventId]
    } = await createEventFlow()

    const resp = await callGetAttendees(
      currentUser.token,
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
            name: host.name,
            role: "hosting"
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 1
      }
    })
  })

  it("should return 200 after paginating middle of page", async () => {
    const { attendeesList, attendeeToken, testEventId, host } =
      await createTestAttendeesList({
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
        attendees: attendeesList.slice(1, 3).map(({ userId: id, name }) => ({
          id,
          name,
          role: "attending"
        })),
        nextPageCursor: getNextPageCursorResp([host, ...attendeesList], 3),
        totalAttendeeCount: 5
      }
    })
  })

  it("should return 200 after paginating the last page of attendees list", async () => {
    const { attendeesList, attendeeToken, testEventId } =
      await createTestAttendeesList({
        numOfAttendees: 2
      })

    let resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit
    )

    const nextPageCursorResp = resp.body.nextPageCursor
    resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit,
      nextPageCursorResp
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
            name: attendeesList[attendeesList.length - 1].name,
            role: "attending"
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 3
      }
    })
  })

  it("should return 200 if going past last page of attendees list", async () => {
    const { attendeeToken, testEventId } = await createTestAttendeesList({
      numOfAttendees: 1
    })

    let resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit
    )

    const nextPageCursorResp = resp.body.nextPageCursor

    resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit,
      nextPageCursorResp
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

  it("check that attendee list is sorted by role, arrivedAt, then joinTimestamp", async () => {
    const { attendeeToken, attendeesList, testEventId, host } =
      await createTestAttendeesList({ numOfAttendees: 3 })

    await callSetArrival(attendeesList[1].token, { coordinate: eventLocation })

    let resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit
    )

    const nextPageCursorResp = resp.body.nextPageCursor
    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resp.body.attendees.forEach((attendee: any) => {
      attendee.joinTimestamp = new Date(attendee.joinTimestamp)
    })
    resp.body.attendees[1].arrivedAt = new Date(
      resp.body.attendees[1].arrivedAt
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: [
          {
            id: host.userId,
            name: host.name,
            joinTimestamp: expect.any(Date),
            arrivalStatus: false,
            arrivedAt: null,
            role: "hosting"
          },
          {
            id: attendeesList[1].userId,
            name: attendeesList[1].name,
            joinTimestamp: expect.any(Date),
            arrivalStatus: true,
            arrivedAt: expect.any(Date),
            role: "attending"
          }
        ],
        nextPageCursor: getNextPageCursorResp(
          [host, attendeesList[1], attendeesList[0], attendeesList[2]],
          1
        ),
        totalAttendeeCount: 4
      }
    })

    resp = await callGetAttendees(
      attendeeToken,
      testEventId,
      paginationLimit,
      nextPageCursorResp
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resp.body.attendees.forEach((attendee: any) => {
      attendee.joinTimestamp = new Date(attendee.joinTimestamp)
    })

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: [
          {
            id: attendeesList[0].userId,
            joinTimestamp: expect.any(Date),
            name: attendeesList[0].name,
            role: "attending",
            arrivalStatus: false,
            arrivedAt: null
          },
          {
            id: attendeesList[2].userId,
            joinTimestamp: expect.any(Date),
            name: attendeesList[2].name,
            arrivalStatus: false,
            role: "attending",
            arrivedAt: null
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 4
      }
    })
  })

  it("should return total attendee count and attendees, exluding ones that blocked current user", async () => {
    const currentUser = await createUserFlow()
    const { attendeesList, testEventId, host } = await createTestAttendeesList({
      numOfAttendees: 3
    })

    for (let i = 0; i < 2; i++) {
      await callBlockUser(attendeesList[i].token, currentUser.userId)
    }

    const resp = await callGetAttendees(
      currentUser.token,
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
            id: host.userId,
            name: host.name,
            arrivalStatus: false,
            role: "hosting",
            relations: { youToThem: "not-friends", themToYou: "not-friends" }
          },
          {
            id: attendeesList[2].userId,
            name: attendeesList[2].name,
            arrivalStatus: false,
            role: "attending",
            relations: { youToThem: "not-friends", themToYou: "not-friends" }
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 2
      }
    })
  })

  it("should return 403 if host blocked current user", async () => {
    const currentUser = await createUserFlow()
    const { host, testEventId } = await createTestAttendeesList({
      numOfAttendees: 2
    })
    await callBlockUser(host.token, currentUser.userId)

    const resp = await callGetAttendees(
      currentUser.token,
      testEventId,
      paginationLimit
    )

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "blocked-by-host" }
    })
  })

  it("should hide attendees who block the current user even if the current user blocks them", async () => {
    const currentUser = await createUserFlow()
    const { attendeesList, host, testEventId } = await createTestAttendeesList({
      numOfAttendees: 3
    })

    for (let i = 0; i < 2; i++) {
      await callBlockUser(attendeesList[i].token, currentUser.userId)
    }

    for (let i = 0; i < 2; i++) {
      await callBlockUser(currentUser.token, attendeesList[i].userId)
    }

    const resp = await callGetAttendees(
      currentUser.token,
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
            id: host.userId,
            name: host.name,
            arrivalStatus: false,
            role: "hosting",
            relations: { youToThem: "not-friends", themToYou: "not-friends" }
          },
          {
            id: attendeesList[2].userId,
            name: attendeesList[2].name,
            arrivalStatus: false,
            role: "attending",
            relations: { youToThem: "not-friends", themToYou: "not-friends" }
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 2
      }
    })
  })

  it("include blocked users in total attendees count when user blocks an attendee or the host", async () => {
    const currentUser = await createUserFlow()
    const { attendeesList, host, testEventId } = await createTestAttendeesList({
      numOfAttendees: 3
    })
    await callBlockUser(currentUser.token, host.userId)

    for (let i = 0; i < 2; i++) {
      await callBlockUser(currentUser.token, attendeesList[0].userId)
    }

    const resp = await callGetAttendees(
      currentUser.token,
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
            id: host.userId,
            name: host.name,
            arrivalStatus: false,
            role: "hosting",
            relations: { youToThem: "blocked", themToYou: "not-friends" }
          },
          {
            id: attendeesList[0].userId,
            name: attendeesList[0].name,
            arrivalStatus: false,
            role: "attending",
            relations: { youToThem: "blocked", themToYou: "not-friends" }
          }
        ],
        nextPageCursor: getNextPageCursorResp([host, ...attendeesList], 1),
        totalAttendeeCount: 4
      }
    })
  })

  it("should return 403 if trying to see attendees list when host and user block each other", async () => {
    const currentUser = await createUserFlow()
    const { host, testEventId } = await createTestAttendeesList({
      numOfAttendees: 3
    })
    await callBlockUser(host.token, currentUser.userId)
    await callBlockUser(currentUser.token, host.userId)

    const resp = await callGetAttendees(
      currentUser.token,
      testEventId,
      paginationLimit
    )

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 403,
      body: { error: "blocked-by-host" }
    })
  })
})
