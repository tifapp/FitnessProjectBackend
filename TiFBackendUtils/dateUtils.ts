import dayjs from "dayjs"

export const calcSecondsToStart = (startDateTime: Date) => {
  const millisecondsToStart = startDateTime.valueOf() - new Date().valueOf()
  return millisecondsToStart / 1000
}

export const calcTodayOrTomorrow = (startDateTime: Date) => {
  const currentDate = dayjs()
  const eventDate = dayjs(startDateTime)

  if (currentDate.isSame(eventDate, "day")) {
    return "today"
  } else if (eventDate.isSame(currentDate.add(1, "day"), "day")) {
    return "tomorrow"
  } else {
    return undefined
  }
}

export const isDayAfter = (
  endedDateTime?: Date
) => {
  if (endedDateTime == null) {
    return false
  }

  const now = dayjs()
  const ended = dayjs(endedDateTime)

  const diffInHours = now.diff(ended, "hour")

  return diffInHours >= 24
}
