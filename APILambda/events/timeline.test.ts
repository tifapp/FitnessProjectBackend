import { now } from "TiFShared/lib/Dayjs"
import { testAPI } from "../test/testApp"
import { createEventFlow } from "../test/userFlows/createEventFlow"
import {
  createUserFlow,
  RegisteredTestUser
} from "../test/userFlows/createUserFlow"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import {
  EventsTimelineDirection,
  EventsTimelinePageToken
} from "TiFShared/api/models/Event"
import { EventID } from "TiFShared/domain-models/Event"

describe("timeline tests", () => {
  it("should return no events when event list empty when fetching forwards", async () => {
    const user = await createUserFlow()
    const resp = await testAPI.timeline<200>({
      auth: user.auth,
      query: { limit: 1, direction: "forwards" }
    })
    expect(resp.data).toMatchObject({
      events: [],
      hasNextPage: false
    })
  })

  it("should return no events when event list empty when fetching backwards", async () => {
    const user = await createUserFlow()
    const resp = await testAPI.timeline<200>({
      auth: user.auth,
      query: { limit: 1, direction: "backwards" }
    })
    expect(resp.data).toMatchObject({
      events: [],
      hasPreviousPage: false
    })
  })

  it("should not return events that the user is not attending", async () => {
    const user = await createUserFlow()
    await createEventFlow([{}])
    const resp = await testAPI.timeline<200>({
      auth: user.auth,
      query: { limit: 1, direction: "forwards" }
    })
    expect(resp.data.events).toEqual([])
  })

  it("should load events in the forwards direction with each request", async () => {
    const current = now()
    const { host, eventIds } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            current.add(1, "hour").toDate(),
            current.add(2, "hour").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.add(30, "minutes").toDate(),
            current.add(1, "hour").add(45, "minutes").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.add(2, "hours").add(30, "minutes").toDate(),
            current.add(3, "hours").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.toDate(),
            current.add(4, "hours").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.add(15, "minutes").toDate(),
            current.add(30, "minutes").toDate()
          )
        }
      ],
      1
    )

    let resp = await expectFetchesNextIds({
      ids: [eventIds[3]],
      user: host,
      isLastPage: false
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[4]],
      user: host,
      token: resp.nextToken,
      isLastPage: false
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[1]],
      user: host,
      token: resp.nextToken,
      isLastPage: false
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[0]],
      user: host,
      token: resp.nextToken,
      isLastPage: false
    })
    await expectFetchesNextIds({
      ids: [eventIds[2]],
      user: host,
      token: resp.nextToken,
      isLastPage: true
    })
  })

  it("should load move the timeline forward when 2 events have the same date range", async () => {
    const current = now()
    const range = dateRange(
      current.add(1, "hour").toDate(),
      current.add(2, "hour").toDate()
    )
    const { host, eventIds } = await createEventFlow(
      [{ dateRange: range }, { dateRange: range }],
      1
    )

    const resp = await expectFetchesNextIds({
      ids: [eventIds[0]],
      user: host,
      isLastPage: false
    })
    await expectFetchesNextIds({
      ids: [eventIds[1]],
      user: host,
      token: resp.nextToken,
      isLastPage: true
    })
  })

  type ExpectNextIdsRequest = {
    ids: EventID[]
    user: RegisteredTestUser
    isLastPage: boolean
    token?: string
    limit?: number
    direction?: EventsTimelineDirection
  }

  const expectFetchesNextIds = async ({
    ids,
    user,
    token,
    isLastPage,
    limit = 1,
    direction = "forwards"
  }: ExpectNextIdsRequest) => {
    const resp = await testAPI.timeline<200>({
      auth: user.auth,
      query: {
        limit,
        direction,
        token: token as unknown as EventsTimelinePageToken
      }
    })
    expect(resp.data.events.map((e) => e.id)).toEqual(ids)
    expect(resp.data.hasNextPage).toEqual(!isLastPage)
    return resp.data
  }
})
