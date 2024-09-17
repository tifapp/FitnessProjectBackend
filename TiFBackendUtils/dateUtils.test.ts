import { calcSecondsToStart, calcTodayOrTomorrow } from "./dateUtils"
import { todayTestDate, tomorrowTestDate } from "./test/dateHelpers"

describe("calcSecondsToStart", () => {
  it("should return the positive seconds before an event starts", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("December 17, 1995 03:24:00"))
    const secondsToStart = calcSecondsToStart(new Date("December 17, 1995 03:25:00"))
    expect(secondsToStart).toEqual(60)
    jest.useRealTimers()
  })

  it("should return the negative seconds after an event starts", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("December 17, 1995 03:25:00"))
    const secondsToStart = calcSecondsToStart(new Date("December 17, 1995 03:24:00"))
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
