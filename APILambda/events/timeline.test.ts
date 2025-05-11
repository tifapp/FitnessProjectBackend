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
      hasNextPageInDirection: false
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
      hasNextPageInDirection: false
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
      isLastPage: false,
      direction: "forwards"
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[4]],
      user: host,
      token: resp.nextToken,
      isLastPage: false,
      direction: "forwards"
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[1]],
      user: host,
      token: resp.nextToken,
      isLastPage: false,
      direction: "forwards"
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[0]],
      user: host,
      token: resp.nextToken,
      isLastPage: false,
      direction: "forwards"
    })
    await expectFetchesNextIds({
      ids: [eventIds[2]],
      user: host,
      token: resp.nextToken,
      isLastPage: true,
      direction: "forwards"
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
      isLastPage: false,
      direction: "forwards"
    })
    await expectFetchesNextIds({
      ids: [eventIds[1]],
      user: host,
      token: resp.nextToken,
      isLastPage: true,
      direction: "forwards"
    })
  })

  it("should load events in the backwards direction with each request", async () => {
    const current = now()
    const { host, eventIds } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            current.subtract(2, "hour").toDate(),
            current.subtract(1, "hour").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.subtract(1, "hour").subtract(45, "minutes").toDate(),
            current.subtract(30, "minutes").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.subtract(3, "hours").toDate(),
            current.subtract(2, "hours").subtract(30, "minutes").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.subtract(4, "hours").toDate(),
            current.toDate()
          )
        },
        {
          dateRange: dateRange(
            current.subtract(30, "minutes").toDate(),
            current.subtract(15, "minutes").toDate()
          )
        }
      ],
      1
    )

    let resp = await expectFetchesNextIds({
      ids: [eventIds[4]],
      user: host,
      isLastPage: false,
      direction: "backwards"
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[1]],
      user: host,
      token: resp.nextToken,
      isLastPage: false,
      direction: "backwards"
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[0]],
      user: host,
      token: resp.nextToken,
      isLastPage: false,
      direction: "backwards"
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[2]],
      user: host,
      token: resp.nextToken,
      isLastPage: false,
      direction: "backwards"
    })
    await expectFetchesNextIds({
      ids: [eventIds[3]],
      user: host,
      token: resp.nextToken,
      isLastPage: true,
      direction: "backwards"
    })
  })

  it("should load move the timeline backwards when 2 events have the same date range", async () => {
    const current = now()
    const range = dateRange(
      current.subtract(2, "hour").toDate(),
      current.subtract(1, "hour").toDate()
    )
    const { host, eventIds } = await createEventFlow(
      [{ dateRange: range }, { dateRange: range }],
      1
    )

    const resp = await expectFetchesNextIds({
      ids: [eventIds[0]],
      user: host,
      isLastPage: false,
      direction: "backwards"
    })
    await expectFetchesNextIds({
      ids: [eventIds[1]],
      user: host,
      token: resp.nextToken,
      isLastPage: true,
      direction: "backwards"
    })
  })

  it("should load forwards then backwards", async () => {
    const current = now()
    const { host, eventIds } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            current.subtract(2, "hour").toDate(),
            current.subtract(1, "hour").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.subtract(3, "hour").toDate(),
            current.subtract(2, "hour").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.add(2, "hour").toDate(),
            current.add(3, "hour").toDate()
          )
        },
        {
          dateRange: dateRange(
            current.add(4, "hour").toDate(),
            current.add(5, "hour").toDate()
          )
        }
      ],
      1
    )

    let resp = await expectFetchesNextIds({
      ids: [eventIds[2]],
      user: host,
      isLastPage: false,
      direction: "forwards"
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[0]],
      user: host,
      token: resp.nextToken,
      isLastPage: false,
      direction: "backwards"
    })
    resp = await expectFetchesNextIds({
      ids: [eventIds[3]],
      user: host,
      token: resp.nextToken,
      isLastPage: true,
      direction: "forwards"
    })
    await expectFetchesNextIds({
      ids: [eventIds[1]],
      user: host,
      token: resp.nextToken,
      isLastPage: true,
      direction: "backwards"
    })
  })

  it("should not load the same event when fetching in each direction", async () => {
    const current = now()
    const { host, eventIds } = await createEventFlow(
      [
        {
          dateRange: dateRange(
            current.subtract(2, "hour").toDate(),
            current.add(1, "hour").toDate()
          )
        }
      ],
      1
    )

    const resp = await expectFetchesNextIds({
      ids: [eventIds[0]],
      user: host,
      isLastPage: true,
      direction: "forwards"
    })
    await expectFetchesNextIds({
      ids: [],
      user: host,
      token: resp.nextToken,
      isLastPage: true,
      direction: "backwards"
    })
  })

  type ExpectNextIdsRequest = {
    ids: EventID[]
    user: RegisteredTestUser
    isLastPage: boolean
    token?: string
    limit?: number
    direction: EventsTimelineDirection
  }

  const expectFetchesNextIds = async ({
    ids,
    user,
    token,
    isLastPage,
    direction,
    limit = 1
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
    expect(resp.data.hasNextPageInDirection).toEqual(!isLastPage)
    return resp.data
  }
})
