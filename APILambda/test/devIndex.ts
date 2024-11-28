import { faker } from "@faker-js/faker"
import "TiFBackendUtils"
import "TiFShared/lib/Zod"
// Only used in local tests

import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { promiseResult, success } from "TiFShared/lib/Result"
import { handler } from "../../GeocodingLambda/index"
import { addTiFRouter, createApp } from "../appMiddleware"
import { ServerEnvironment } from "../env"
import { localhostListener } from "./localhostListener"
import { mockLocationCoordinate2D } from "./testEvents"

const geocodeMock = async (coords: LocationCoordinate2D) => ({
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

export const devEnv: ServerEnvironment = {
  environment: "devTest",
  maxArrivals: 4,
  eventStartWindowInHours: 1,
  geocode: (location) => {
    return promiseResult(
      handler(
        location,
        geocodeMock,
        mockLocationCoordinate2D
      ).then(response => {
        return success(response)
      })
    )
  }
}

export const devApp = createApp(devEnv, addTiFRouter, localhostListener)
