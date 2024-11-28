import { faker } from "@faker-js/faker"
import { conn } from "TiFBackendUtils"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addLocationToDB } from "../../GeocodingLambda/utils"

export const addMockLocationToDB = (coords: LocationCoordinate2D) =>
  addLocationToDB(
    conn,
    {
      ...coords,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      streetNumber: "1234"
    },
    "Sample/Timezone"
  )

export const geocodeMock = async (coords: LocationCoordinate2D) => ({
  ...coords,
  name: faker.company.name(),
  country: faker.address.country(),
  postalCode: faker.address.zipCode(),
  street: faker.address.street(),
  streetNumber: faker.address.buildingNumber(),
  region: faker.address.state(),
  isoCountryCode: faker.address.countryCode(),
  city: faker.address.city()
})
