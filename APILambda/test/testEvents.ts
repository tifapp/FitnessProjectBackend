import { faker } from "@faker-js/faker"
import { CreateEventInput } from "../events/createEvent.js"

const mockLocationCoordinate2D = () => ({
  latitude: parseFloat(faker.address.latitude()),
  longitude: parseFloat(faker.address.longitude())
})

const createTestEvent = (): CreateEventInput => {
  const startDate = Math.floor(Math.random() * 1000)
  const endDate = startDate + 10000
  return {
    title: faker.word.noun({ length: { min: 5, max: 50 } }),
    description: faker.animal.rodent(),
    startTimestamp: new Date(startDate),
    endTimestamp: new Date(endDate),
    color: "#72B01D",
    shouldHideAfterStartDate: true,
    isChatEnabled: true,
    ...mockLocationCoordinate2D()
  }
}

const createTestEvents = (events: number) => {
  const result = []

  for (let i = 0; i < events; i++) {
    result.push(createTestEvent())
  }

  return result
}

export const testEvents: CreateEventInput[] = createTestEvents(10)
