import "TiFBackendUtils"
import "TiFShared/lib/Zod"
// Only used in local tests

import { promiseResult, success } from "TiFShared/lib/Result"
import { handler } from "../../GeocodingLambda/index"
import { addTiFRouter, createApp } from "../appMiddleware"
import { ServerEnvironment } from "../env"
import { mockLocationCoordinate2D } from "./testEvents"
import { geocodeMock } from "./location"

export const devEnv: ServerEnvironment = {
  environment: "devTest",
  maxArrivals: 4,
  eventStartWindowInHours: 1,
  geocode: (location) => {
    return promiseResult(
      handler(location, geocodeMock, async () =>
        mockLocationCoordinate2D()
      ).then((response) => {
        return success(response)
      })
    )
  }
}

export const devApp = createApp(devEnv, addTiFRouter)
