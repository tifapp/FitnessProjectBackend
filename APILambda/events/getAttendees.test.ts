import { conn } from "TiFBackendUtils"
import dayjs from "dayjs"
import { decodeAttendeesListCursor } from "../shared/Cursor"
import { callGetAttendees, callSetArrival } from "../test/apiCallers/events"
import { callBlockUser } from "../test/apiCallers/users"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/events"
import { TestUser, createUserFlow } from "../test/userFlows/users"
import { createEvent } from "./createEvent"

const eventLocation = { latitude: 50, longitude: 50 }
// TODO: should have a universal "lastpagecursor" value
const lastPageCursorResponse = {
  userId: "lastPage",
  joinedDateTime: null,
  arrivedDateTime: null
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
    host,
    attendeesList,
    eventIds: [testEventId]
  } = await createEventFlow([{ ...eventLocation }], numOfAttendees)

  return {
    attendeeToken: attendeesList?.[1]?.token,
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
 * @returns {AttendeesCursorResponse} - An object representing the next page cursor response with userId, joinedDateTime, and arrivedDateTime properties.
 */
const getNextPageCursorResp = (
  testAttendees: Array<TestUser>,
  index: number
): Omit<unknown, "arrivedDateTime"> => {
  return {
    userId: testAttendees[index].userId,
    joinedDateTime: index >= testAttendees.length ? null : expect.any(Date)
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

    // In this test, we want to create an event with an empty attendees list, so we must use createEvent directly.
    // if we use the create event flow the host will be added to the attendees list.
    const {
      value: { insertId }
    } = await createEvent(
      conn,
      {
        ...testEventInput,
        startDateTime: dayjs().add(12, "hour").toDate(),
        endDateTime: dayjs().add(24, "hour").toDate()
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
    const { attendeesList, attendeeToken, testEventId } =
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
            id: attendeesList[0].userId,
            name: attendeesList[0].name,
            role: "hosting"
          },
          {
            id: attendeesList[1].userId,
            name: attendeesList[1].name,
            role: "attending"
          }
        ],
        nextPageCursor: getNextPageCursorResp(attendeesList, 1),
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
    const { attendeesList, attendeeToken, testEventId } =
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
        attendees: attendeesList.slice(2, 4).map(({ userId: id, name }) => ({
          id,
          name,
          role: "attending"
        })),
        nextPageCursor: getNextPageCursorResp(attendeesList, 3),
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

  it("check that attendee list is sorted by role, arrivedDateTime, then joinedDateTime", async () => {
    const { attendeeToken, attendeesList, testEventId } =
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
      attendee.joinedDateTime = new Date(attendee.joinedDateTime)
    })
    resp.body.attendees[1].arrivedDateTime = new Date(
      resp.body.attendees[1].arrivedDateTime
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: [
          {
            id: attendeesList[0].userId,
            name: attendeesList[0].name,
            joinedDateTime: expect.any(Date),
            hasArrived: false,
            arrivedDateTime: null,
            role: "hosting"
          },
          {
            id: attendeesList[1].userId,
            name: attendeesList[1].name,
            joinedDateTime: expect.any(Date),
            hasArrived: true,
            arrivedDateTime: expect.any(Date),
            role: "attending"
          }
        ],
        nextPageCursor: getNextPageCursorResp(
          [attendeesList[0], attendeesList[1]],
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
      attendee.joinedDateTime = new Date(attendee.joinedDateTime)
    })

    resp.body.nextPageCursor = decodeAttendeesListCursor(
      resp.body.nextPageCursor
    )

    expect(resp).toMatchObject({
      status: 200,
      body: {
        attendees: [
          {
            id: attendeesList[2].userId,
            joinedDateTime: expect.any(Date),
            name: attendeesList[2].name,
            role: "attending",
            hasArrived: false,
            arrivedDateTime: null
          },
          {
            id: attendeesList[3].userId,
            joinedDateTime: expect.any(Date),
            name: attendeesList[3].name,
            hasArrived: false,
            role: "attending",
            arrivedDateTime: null
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 4
      }
    })
  })

  it("should return total attendee count and attendees, excluding ones that blocked current user", async () => {
    const currentUser = await createUserFlow()
    const { attendeesList, testEventId } = await createTestAttendeesList({
      numOfAttendees: 3
    })

    for (let i = 1; i < 3; i++) {
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
            id: attendeesList[0].userId,
            name: attendeesList[0].name,
            hasArrived: false,
            role: "hosting",
            relations: { fromYouToThem: "not-friends", fromThemToYou: "not-friends" }
          },
          {
            id: attendeesList[3].userId,
            name: attendeesList[3].name,
            hasArrived: false,
            role: "attending",
            relations: { fromYouToThem: "not-friends", fromThemToYou: "not-friends" }
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
    const { attendeesList, testEventId } = await createTestAttendeesList({
      numOfAttendees: 3
    })

    for (let i = 1; i < 3; i++) {
      await callBlockUser(attendeesList[i].token, currentUser.userId)
    }

    for (let i = 1; i < 3; i++) {
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
            id: attendeesList[0].userId,
            name: attendeesList[0].name,
            hasArrived: false,
            role: "hosting",
            relations: { fromYouToThem: "not-friends", fromThemToYou: "not-friends" }
          },
          {
            id: attendeesList[3].userId,
            name: attendeesList[3].name,
            hasArrived: false,
            role: "attending",
            relations: { fromYouToThem: "not-friends", fromThemToYou: "not-friends" }
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 2
      }
    })
  })

  it("include blocked users in total attendees count when user blocks an attendee or the host", async () => {
    const currentUser = await createUserFlow()
    const { attendeesList, testEventId } = await createTestAttendeesList({
      numOfAttendees: 3
    })
    await callBlockUser(currentUser.token, attendeesList[0].userId)

    for (let i = 1; i < 3; i++) {
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
            id: attendeesList[0].userId,
            name: attendeesList[0].name,
            hasArrived: false,
            role: "hosting",
            relations: { fromYouToThem: "blocked", fromThemToYou: "not-friends" }
          },
          {
            id: attendeesList[1].userId,
            name: attendeesList[1].name,
            hasArrived: false,
            role: "attending",
            relations: { fromYouToThem: "blocked", fromThemToYou: "not-friends" }
          }
        ],
        nextPageCursor: getNextPageCursorResp(attendeesList, 1),
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
