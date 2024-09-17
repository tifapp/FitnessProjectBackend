import dayjs from "dayjs"

export const todayTestDate = () => dayjs().set("minute", 59).set("second", 59).toDate()

export const tomorrowTestDate = () => dayjs().add(1, "day").toDate()
