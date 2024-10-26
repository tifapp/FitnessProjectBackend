import dayjs from "dayjs"

// reason: milliseconds are not counted in the live database

export const todayTestDate = () => dayjs().set("minute", 59).set("second", 59).millisecond(0).toDate()

export const tomorrowTestDate = () => dayjs().add(1, "day").millisecond(0).toDate()
