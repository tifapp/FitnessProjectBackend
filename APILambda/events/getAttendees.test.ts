import dayjs from "dayjs"
import { createEventFlow } from "../test/userFlows/events.js"
import { callGetAttendees, callJoinEvent } from "../test/apiCallers/events.js"
import { encodeCursor } from "../shared/Cursor.js"
import { createUserFlow } from "../test/userFlows/users.js"

describe("Join the event by id tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }
  const limit = 1

  it("should return 200 after loading the attendees list", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    // const { token: attendeeToken2 } = await createUserFlow()
    // await callJoinEvent(attendeeToken2, eventIds[0])

    const nextCursor = encodeCursor(
      null,
      dayjs("1970-01-01T00:00:00Z").toDate()
    )

    const respAll = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      10
    )

    console.log("respALL")
    console.log(respAll.body)

    // Initial cursor
    const resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      limit
    )

    console.log("RESP1")
    console.log(resp.body)

    let { nextPageUserId, nextPageJoinDate } = resp.body
    const nextCursor2 = encodeCursor(nextPageUserId, nextPageJoinDate)

    const resp2 = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor2,
      limit
    )

    console.log("RESP2")
    console.log(resp2.body)

    let {
      nextPageUserId: nextPageUserId2,
      nextPageJoinDate: nextPageJoinDate2
    } = resp2.body
    const nextCursor3 = encodeCursor(nextPageUserId2, nextPageJoinDate2)

    const resp3 = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor3,
      limit
    )

    console.log("RESP3")
    console.log(resp3.body)

    expect(resp).toMatchObject({
      status: 200,
      body: {
        // TODO
      }
    })
  })
})
