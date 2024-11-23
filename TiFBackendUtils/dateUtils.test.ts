import { dayjs } from "TiFShared/lib/Dayjs"
import {
  calcSecondsToStart,
  calcTodayOrTomorrow,
  isDayAfter
} from "./dateUtils"
import { todayTestDate, tomorrowTestDate } from "./test/dateHelpers"

describe("calcSecondsToStart", () => {
  it("should return the positive seconds before an event starts", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("December 17, 1995 03:24:00"))
    const secondsToStart = calcSecondsToStart(
      new Date("December 17, 1995 03:25:00")
    )
    expect(secondsToStart).toEqual(60)
    jest.useRealTimers()
  })

  it("should return the negative seconds after an event starts", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("December 17, 1995 03:25:00"))
    const secondsToStart = calcSecondsToStart(
      new Date("December 17, 1995 03:24:00")
    )
    expect(secondsToStart).toEqual(-60)
    jest.useRealTimers()
  })
})

describe("calcTodayOrTomorrow", () => {
  it("should return 'Today' if the secondsToStart is less than SECONDS_IN_DAY", async () => {
    expect(calcTodayOrTomorrow(todayTestDate())).toEqual("today")
  })

  it("should return 'Tomorrow' if the secondsToStart is greater than or equal to SECONDS_IN_DAY", async () => {
    expect(calcTodayOrTomorrow(tomorrowTestDate())).toEqual("tomorrow")
  })
})

describe("isDayAfter", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("should return false when endedDateTime is undefined", () => {
    expect(isDayAfter()).toBe(false)
  })

  const fixedNow = new Date("2024-04-01T12:00:00Z")

  it("should return false when less than 24 hours have passed since endedDateTime", () => {
    jest.setSystemTime(fixedNow)

    const endedDateTime = dayjs(fixedNow).subtract(23, "hour").toDate()

    expect(isDayAfter(endedDateTime)).toBe(false)
  })

  it("should return true when at least 24 hours have passed since endedDateTime", () => {
    jest.setSystemTime(fixedNow)

    const endedDateTime = dayjs(fixedNow).subtract(24, "hour").toDate()

    expect(isDayAfter(endedDateTime)).toBe(true)
  })
})
