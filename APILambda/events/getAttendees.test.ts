import dayjs from "dayjs"
import { createEventFlow } from "../test/userFlows/events.js"
import { callGetAttendees, callJoinEvent } from "../test/apiCallers/events.js"
import { encodeCursor } from "../shared/Cursor.js";
import { createUserFlow } from "../test/userFlows/users.js";

describe("Join the event by id tests", () => {
  const eventLocation = { latitude: 50, longitude: 50 }

  it("should return 200 after loading the attendees list", async () => {
    const { attendeeToken, eventIds } = await createEventFlow([
      {
        ...eventLocation,
        startTimestamp: dayjs().add(12, "hour").toDate(),
        endTimestamp: dayjs().add(1, "year").toDate()
      }
    ])

    const { token: attendeeToken2 } = await createUserFlow()
    await callJoinEvent(attendeeToken2, eventIds[0])

    const nextCursor = encodeCursor(null, dayjs("1970-01-01T00:00:00Z").toDate());

    // Initial cursor
    const resp = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor,
      2
    )

    const {nextPageUserId, nextPageJoinDate} = resp.body;
    const nextCursor2 = encodeCursor(nextPageUserId, nextPageJoinDate);

    const resp2 = await callGetAttendees(
      attendeeToken,
      eventIds[0],
      nextCursor2,
      2
    )
    
    expect(resp).toMatchObject({
      status: 200,
      body: {
        // TODO
      }
    })
  })
})
