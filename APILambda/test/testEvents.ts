import { faker } from "@faker-js/faker"
import {
  todayTestDate,
  tomorrowTestDate
} from "TiFBackendUtils/test/dateHelpers"
import { CreateEvent } from "TiFShared/domain-models/Event"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { dayjs } from "TiFShared/lib/Dayjs"

// Coords in the US mainland
const mockLocationCoordinate2D = () => ({
  latitude: parseFloat(faker.address.latitude(49.3, 24.4)),
  longitude: parseFloat(faker.address.longitude(-66.9, -125))
})

const createTestEvent = (): Omit<CreateEvent, "location"> & {location: {type: "coordinate", value: LocationCoordinate2D}} => ({
  title: faker.word.noun({ length: { min: 5, max: 50 } }),
  description: faker.animal.rodent(),
  dateRange: dateRange(todayTestDate(), tomorrowTestDate())!,
  shouldHideAfterStartDate: true,
  isChatEnabled: true,
  location: {
    type: "coordinate",
    value: mockLocationCoordinate2D()
  }
})

export const testEventCoordinate = { latitude: 50, longitude: 50 }

export const testEventInput = createTestEvent()

// reason: milliseconds are not counted in the live database
export const upcomingEventDateRange = dateRange(
  dayjs().add(12, "hour").millisecond(0).toDate(),
  dayjs().add(1, "year").millisecond(0).toDate()
)!
