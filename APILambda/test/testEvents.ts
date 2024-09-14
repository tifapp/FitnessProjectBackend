import { faker } from "@faker-js/faker"
import { CreateEvent } from "TiFShared/api/models/Event"
import { ColorString } from "TiFShared/domain-models/ColorString"
import { dateRange } from "TiFShared/domain-models/FixedDateRange"
import { dayjs } from "TiFShared/lib/Dayjs"

// Coords in the US mainland
const mockLocationCoordinate2D = () => ({
  latitude: parseFloat(faker.address.latitude(49.3, 24.4)),
  longitude: parseFloat(faker.address.longitude(-66.9, -125))
})

const createTestEvent = (): CreateEvent =>
  ({
    title: faker.word.noun({ length: { min: 5, max: 50 } }),
    description: faker.animal.rodent(),
    dateRange: dateRange(dayjs().add(1, "month").toDate(), dayjs().add(2, "month").toDate())!,
    color: ColorString.parse("#72B01D")!,
    shouldHideAfterStartDate: true,
    isChatEnabled: true,
    coordinates: mockLocationCoordinate2D()
  })

export const testEventInput: CreateEvent = createTestEvent()
