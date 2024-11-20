import { conn } from "TiFBackendUtils"
import { TestUser } from "../global"
import { userToUserRequest } from "../test/shortcuts"
import { testAPI } from "../test/testApp"
import { testEventInput } from "../test/testEvents"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import { createUserFlow } from "../test/userFlows/createUserFlow"
import { AttendeesListCursor, decodeAttendeesListCursor } from "../utils/Cursor"
import { createEventSQL } from "./createEvent"

const eventLocation = { latitude: 50, longitude: 50 }
// TODO: should have a universal "lastpagecursor" value
const lastPageCursorResponse: AttendeesListCursor = {
  userId: "lastPage"
}
const limit = 2

/**
 * Retrieve a response containing a list of attendees for a given event.
 *
 * @param {number} numOfAttendees - The number of additional attendees to simulate for testing purposes (default: 0).
 * @param {number} limit - The maximum number of attendees to include in the response (default: 5).
 * @returns {Promise<request.Response>} A Promise that resolves with the response containing the list of attendees.
 */

const createTestAttendees = async (numOfAttendees: number = 1) => {
  const {
    host,
    attendeesList,
    eventIds: [eventId]
  } = await createEventFlow([{ coordinates: eventLocation }], numOfAttendees)

  return {
    attendeesList,
    eventId,
    host
  }
}

/**
 * Function to retrieve the next page cursor response based on the provided attendee information.
 *
 * @param {Array} testAttendees - An array containing information about all attendees.
 * @param {number} index - The index indicating the position of the attendee for which the response is generated.
 * @returns {AttendeesListCursor} - An object representing the next page cursor response with id, joinedDateTime, and arrivedDateTime properties.
 */
const getNextPageCursorResp = (
  testAttendees: Array<TestUser>,
  index: number
): Omit<AttendeesListCursor, "arrivedDateTime"> => {
  return {
    userId: testAttendees[index].id,
    joinedDateTime: index >= testAttendees.length ? undefined : expect.any(Date)
  }
}

describe("getAttendeesList endpoint", () => {
  it("should return 400 if limit is less than one", async () => {
    const {
      attendeesList: [, attendee],
      eventId
    } = await createTestAttendees(1)

    const resp = await testAPI.attendeesList({
      auth: attendee.auth,
      params: { eventId },
      query: { limit: 0 }
    })

    expect(resp).toMatchObject({
      status: 400,
      data: {
        error: "invalid-request"
      }
    })
  })

  it("should return 400 if limit is greater than fifty", async () => {
    const {
      attendeesList: [, attendee],
      eventId
    } = await createTestAttendees(1)

    const resp = await testAPI.attendeesList({
      auth: attendee.auth,
      params: { eventId },
      query: { limit: 51 }
    })

    expect(resp).toMatchObject({
      status: 400,
      data: {
        error: "invalid-request"
      }
    })
  })

  it("should return 404 if attendee list is empty", async () => {
    const currentUser = await createUserFlow()

    // We must use createEventSQL directly because createEventFlow() makes an event with the host in the attendees list.
    const {
      value: { insertId }
    } = await createEventSQL(conn, testEventInput, currentUser.id)

    const resp = await testAPI.attendeesList<200>({
      auth: currentUser.auth,
      params: { eventId: Number(insertId) },
      query: { limit }
    })

    expect(resp).toMatchObject({
      status: 404,
      data: {
        error: "no-attendees"
      }
    })
  })

  it("should return 404 if event doesn't exist", async () => {
    const currentUser = await createUserFlow()

    const eventId = 9999
    const resp = await testAPI.attendeesList({
      auth: currentUser.auth,
      params: { eventId },
      query: { limit }
    })

    expect(resp).toMatchObject({
      status: 404,
      data: {
        error: "event-not-found"
      }
    })
  })

  it("should return 200 after paginating the first page of attendees list", async () => {
    const { attendeesList, eventId } = await createTestAttendees(3)

    const [attendee1, attendee2] = attendeesList

    const resp = await testAPI.attendeesList<200>({
      auth: attendee1.auth,
      params: { eventId },
      query: { limit }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [
          {
            id: attendee1.id,
            name: attendee1.name,
            role: "hosting"
          },
          {
            id: attendee2.id,
            name: attendee2.name,
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

    const resp = await testAPI.attendeesList<200>({
      auth: currentUser.auth,
      params: { eventId },
      query: { limit }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [
          {
            id: host.id,
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
    const { attendeesList, eventId } = await createTestAttendees(4)

    const [attendee] = attendeesList

    let resp = await testAPI.attendeesList<200>({
      auth: attendee.auth,
      params: { eventId },
      query: { limit }
    })

    const middlePageCursorResp = resp.data.nextPageCursor
    resp = await testAPI.attendeesList<200>({
      auth: attendee.auth,
      params: { eventId },
      query: { limit, nextPageCursor: middlePageCursorResp ?? undefined }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: attendeesList.slice(2, 4).map(({ id, name }) => ({
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
    const { attendeesList, eventId } = await createTestAttendees(2)

    const [, attendee] = attendeesList

    let resp = await testAPI.attendeesList<200>({
      auth: attendee.auth,
      params: { eventId },
      query: { limit }
    })

    const nextPageCursorResp = resp.data.nextPageCursor
    resp = await testAPI.attendeesList<200>({
      auth: attendee.auth,
      params: { eventId },
      query: { limit, nextPageCursor: nextPageCursorResp ?? undefined }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [
          {
            id: attendeesList[attendeesList.length - 1].id,
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
    const {
      attendeesList: [, attendee],
      eventId
    } = await createTestAttendees(1)

    let resp = await testAPI.attendeesList<200>({
      auth: attendee.auth,
      params: { eventId },
      query: { limit }
    })

    const nextPageCursorResp = resp.data.nextPageCursor

    resp = await testAPI.attendeesList<200>({
      auth: attendee.auth,
      params: { eventId },
      query: { limit, nextPageCursor: nextPageCursorResp ?? undefined }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 2
      }
    })
  })

  it("check that attendee list is sorted by role, arrivedDateTime, then joinedDateTime", async () => {
    const { host, attendeesList, eventId } = await createTestAttendees(3)

    const [, attendee] = attendeesList

    await testAPI.arriveAtRegion({
      auth: attendee.auth,
      body: { coordinate: eventLocation, arrivalRadiusMeters: 500 }
    })

    let resp = await testAPI.attendeesList<200>({
      auth: attendee.auth,
      params: { eventId },
      query: { limit }
    })

    const nextPageCursorResp = resp.data.nextPageCursor
    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [
          {
            id: host.id,
            name: host.name,
            hasArrived: false,
            role: "hosting"
          },
          {
            id: attendee.id,
            name: attendee.name,
            hasArrived: true,
            role: "attending"
          }
        ],
        nextPageCursor: getNextPageCursorResp([host, attendee], 1),
        totalAttendeeCount: 4
      }
    })

    resp = await testAPI.attendeesList<200>({
      auth: attendee.auth,
      params: { eventId },
      query: { limit, nextPageCursor: nextPageCursorResp ?? undefined }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [
          {
            id: attendeesList[2].id,
            name: attendeesList[2].name,
            role: "attending",
            hasArrived: false
          },
          {
            id: attendeesList[3].id,
            name: attendeesList[3].name,
            hasArrived: false,
            role: "attending"
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 4
      }
    })
  })

  it("should return total attendee count and attendees, excluding ones that blocked current user", async () => {
    const currentUser = await createUserFlow()
    const { attendeesList, eventId } = await createTestAttendees(3)

    for (let i = 1; i < 3; i++) {
      await testAPI.blockUser(userToUserRequest(attendeesList[i], currentUser))
    }

    const resp = await testAPI.attendeesList<200>({
      auth: currentUser.auth,
      params: { eventId },
      query: { limit }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [
          {
            id: attendeesList[0].id,
            name: attendeesList[0].name,
            hasArrived: false,
            role: "hosting",
            relationStatus: "not-friends"
          },
          {
            id: attendeesList[3].id,
            name: attendeesList[3].name,
            hasArrived: false,
            role: "attending",
            relationStatus: "not-friends"
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 2
      }
    })
  })

  it("should return 403 if host blocked current user", async () => {
    const currentUser = await createUserFlow()
    const { host, eventId } = await createTestAttendees(2)
    await testAPI.blockUser(userToUserRequest(host, currentUser))

    const resp = await testAPI.attendeesList({
      auth: currentUser.auth,
      params: { eventId },
      query: { limit }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "blocked-you" }
    })
  })

  it("should hide attendees who block the current user even if the current user blocks them", async () => {
    const currentUser = await createUserFlow()
    const { attendeesList, eventId } = await createTestAttendees(3)

    for (let i = 1; i < 3; i++) {
      await testAPI.blockUser(userToUserRequest(attendeesList[i], currentUser))
    }

    for (let i = 1; i < 3; i++) {
      await testAPI.blockUser(userToUserRequest(currentUser, attendeesList[i]))
    }

    const resp = await testAPI.attendeesList<200>({
      auth: currentUser.auth,
      params: { eventId },
      query: { limit }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [
          {
            id: attendeesList[0].id,
            name: attendeesList[0].name,
            hasArrived: false,
            role: "hosting",
            relationStatus: "not-friends"
          },
          {
            id: attendeesList[3].id,
            name: attendeesList[3].name,
            hasArrived: false,
            role: "attending",
            relationStatus: "not-friends"
          }
        ],
        nextPageCursor: lastPageCursorResponse,
        totalAttendeeCount: 2
      }
    })
  })

  it("include blocked users in total attendees count when user blocks an attendee or the host", async () => {
    const currentUser = await createUserFlow()
    const { host, attendeesList, eventId } = await createTestAttendees(3)
    await testAPI.blockUser(userToUserRequest(currentUser, host))

    for (let i = 1; i < 3; i++) {
      await testAPI.blockUser(userToUserRequest(currentUser, attendeesList[i]))
    }

    const resp = await testAPI.attendeesList<200>({
      auth: currentUser.auth,
      params: { eventId },
      query: { limit }
    })

    ;(resp.data.nextPageCursor as unknown) = decodeAttendeesListCursor(
      resp.data.nextPageCursor ?? undefined
    )

    expect(resp).toMatchObject({
      status: 200,
      data: {
        attendees: [
          {
            id: attendeesList[0].id,
            name: attendeesList[0].name,
            hasArrived: false,
            role: "hosting",
            relationStatus: "blocked-them"
          },
          {
            id: attendeesList[1].id,
            name: attendeesList[1].name,
            hasArrived: false,
            role: "attending",
            relationStatus: "blocked-them"
          }
        ],
        nextPageCursor: getNextPageCursorResp(attendeesList, 1),
        totalAttendeeCount: 4
      }
    })
  })

  it("should return 403 if trying to see attendees list when host and user block each other", async () => {
    const currentUser = await createUserFlow()
    const { host, eventId } = await createTestAttendees(3)
    await testAPI.blockUser(userToUserRequest(host, currentUser))
    await testAPI.blockUser(userToUserRequest(currentUser, host))

    const resp = await testAPI.attendeesList({
      auth: currentUser.auth,
      params: { eventId },
      query: { limit }
    })

    expect(resp).toMatchObject({
      status: 403,
      data: { error: "blocked-you" }
    })
  })
})
