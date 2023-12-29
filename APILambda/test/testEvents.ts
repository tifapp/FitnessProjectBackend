import { faker } from "@faker-js/faker"
import { CreateEventInput } from "../events/createEvent.js"

const mockLocationCoordinate2D = () => ({
  latitude: parseFloat(faker.address.latitude()),
  longitude: parseFloat(faker.address.longitude())
})

const createTestEvent = (): CreateEventInput => {
  return {
    title: faker.word.noun({ length: { min: 5, max: 50 } }),
    description: faker.animal.rodent(),
    startTimestamp: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    endTimestamp: new Date(new Date().setMonth(new Date().getMonth() + 2)),
    color: "#72B01D",
    shouldHideAfterStartDate: true,
    isChatEnabled: true,
    ...mockLocationCoordinate2D()
  }
}

export const testEvent: CreateEventInput = createTestEvent()
