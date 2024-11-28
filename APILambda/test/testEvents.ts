import { faker } from "@faker-js/faker"
import {
  todayTestDate,
  tomorrowTestDate
} from "TiFBackendUtils/test/dateHelpers"
import { EventEdit } from "TiFShared/domain-models/Event"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { dayjs } from "TiFShared/lib/Dayjs"

// Coords in the US mainland
export const mockLocationCoordinate2D = () => ({
  latitude: parseFloat(faker.address.latitude(49.3, 24.4)),
  longitude: parseFloat(faker.address.longitude(-66.9, -125))
})

const createTestEvent = (): EventEdit => ({
  title: faker.word.noun({ length: { min: 5, max: 50 } }),
  description: faker.animal.rodent(),
  startDateTime: todayTestDate(),
  duration: dateRange(todayTestDate(), tomorrowTestDate())!.diff.seconds,
  shouldHideAfterStartDate: true,
  location: {
    type: "coordinate",
    value: mockLocationCoordinate2D()
  }
})

export const testEventCoordinate = { latitude: 50, longitude: 50 }

export const testEventInput = createTestEvent()

// reason: milliseconds are not counted in the live database
export const upcomingEventDateRange = dateRange(
  dayjs().add(12, "hour").toDate(),
  dayjs().add(1, "year").toDate()
)!
